/**
 * Face.js - AI 人脸识别模块
 * 基于 @vladmandic/face-api 实现人脸检测、特征提取与比对
 * 包含感知哈希降级方案
 */

const FaceModule = {
  MODEL_URL: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model/',
  modelsLoaded: false,
  loadingPromise: null,

  // ==================== 模型加载 ====================
  async loadModels() {
    if (this.modelsLoaded) return true;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        // 确保face-api已加载
        if (typeof faceapi === 'undefined') {
          console.warn('face-api.js 未加载，将使用降级方案');
          return false;
        }

        // 并行加载所有模型
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(this.MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL),
        ]);

        this.modelsLoaded = true;
        console.log('人脸识别模型加载成功');
        return true;
      } catch (err) {
        console.warn('人脸识别模型加载失败，将使用降级方案:', err);
        // 尝试备用CDN
        try {
          await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri('https://raw.githubusercontent.com/vladmandic/face-api/master/model/'),
            faceapi.nets.faceLandmark68Net.loadFromUri('https://raw.githubusercontent.com/vladmandic/face-api/master/model/'),
            faceapi.nets.faceRecognitionNet.loadFromUri('https://raw.githubusercontent.com/vladmandic/face-api/master/model/'),
          ]);
          this.modelsLoaded = true;
          console.log('人脸识别模型加载成功(备用源)');
          return true;
        } catch (err2) {
          console.warn('备用模型源也失败:', err2);
          return false;
        }
      }
    })();

    return this.loadingPromise;
  },

  // ==================== 从图片元素检测人脸并提取特征 ====================
  async detectAndDescribe(imgElement) {
    const loaded = await this.loadModels();
    
    if (loaded && typeof faceapi !== 'undefined') {
      try {
        const detection = await faceapi
          .detectSingleFace(imgElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          return { success: false, error: '未检测到人脸，请确保照片中有清晰的人脸' };
        }

        return {
          success: true,
          descriptor: Array.from(detection.descriptor),
          score: detection.detection.score,
          box: detection.detection.box,
          method: 'face-api',
        };
      } catch (err) {
        console.warn('face-api检测失败，使用降级方案:', err);
      }
    }

    // 降级方案：感知哈希
    return this.perceptualHashDetect(imgElement);
  },

  // ==================== 感知哈希降级方案 ====================
  async perceptualHashDetect(imgElement) {
    try {
      const canvas = document.createElement('canvas');
      const size = 32;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgElement, 0, 0, size, size);
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;

      // 转灰度
      const gray = [];
      for (let i = 0; i < data.length; i += 4) {
        gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      }

      // 计算DCT-like的平均值（简化版）
      const avg = gray.reduce((a, b) => a + b, 0) / gray.length;

      // 生成哈希
      const hash = gray.map(v => v > avg ? 1 : 0);

      return {
        success: true,
        descriptor: hash,
        method: 'pHash',
      };
    } catch (err) {
      return { success: false, error: '图像处理失败: ' + err.message };
    }
  },

  // ==================== 比对两个人脸特征 ====================
  compare(descriptor1, descriptor2) {
    if (!descriptor1 || !descriptor2) return { match: false, distance: 1, similarity: 0 };

    // face-api 路径：欧氏距离
    if (Array.isArray(descriptor1) && descriptor1.length === 128 && 
        Array.isArray(descriptor2) && descriptor2.length === 128) {
      let sum = 0;
      for (let i = 0; i < 128; i++) {
        const diff = descriptor1[i] - descriptor2[i];
        sum += diff * diff;
      }
      const distance = Math.sqrt(sum);
      // 阈值 0.6 以下认为是同一人
      const similarity = Math.max(0, Math.min(1, 1 - distance / 1.2));
      return {
        match: distance < 0.55,
        distance: distance,
        similarity: similarity,
        method: 'face-api',
      };
    }

    // 感知哈希路径：汉明距离
    if (Array.isArray(descriptor1) && Array.isArray(descriptor2) && 
        descriptor1.length === descriptor2.length) {
      let diff = 0;
      for (let i = 0; i < descriptor1.length; i++) {
        if (descriptor1[i] !== descriptor2[i]) diff++;
      }
      const similarity = 1 - diff / descriptor1.length;
      return {
        match: similarity > 0.8,
        distance: diff,
        similarity: similarity,
        method: 'pHash',
      };
    }

    return { match: false, distance: 1, similarity: 0 };
  },

  // ==================== 从文件创建Image元素 ====================
  fileToImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve({ img, dataUrl: e.target.result });
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // ==================== 从Data URL创建Image元素 ====================
  dataUrlToImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  },

  // ==================== 压缩图片 ====================
  compressImage(dataUrl, maxWidth = 800, quality = 0.85) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxWidth) {
          h = (h * maxWidth) / w;
          w = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  },

  // ==================== 在所有已备案人员中查找匹配 ====================
  async verifyAgainstDatabase(imgElement) {
    const result = await this.detectAndDescribe(imgElement);
    if (!result.success) return result;

    const activePermits = Store.getActivePermits();
    if (activePermits.length === 0) {
      return {
        success: true,
        matched: false,
        message: '当前无已备案人员数据',
        method: result.method,
      };
    }

    let bestMatch = null;
    let bestSimilarity = 0;

    for (const permit of activePermits) {
      if (!permit.faceDescriptor) continue;
      const comparison = this.compare(result.descriptor, permit.faceDescriptor);
      if (comparison.similarity > bestSimilarity) {
        bestSimilarity = comparison.similarity;
        bestMatch = { permit, comparison };
      }
    }

    if (bestMatch && bestMatch.comparison.match) {
      return {
        success: true,
        matched: true,
        permit: bestMatch.permit,
        similarity: bestMatch.comparison.similarity,
        distance: bestMatch.comparison.distance,
        method: result.method,
      };
    }

    return {
      success: true,
      matched: false,
      bestSimilarity: bestSimilarity,
      method: result.method,
    };
  },
};
