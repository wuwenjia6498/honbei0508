const { userApi, initApi } = require('../../../utils/cloudApi');
const app = getApp();

Page({
  data: {
    // 开发阶段，默认为管理员权限
    isAdmin: true,
    loading: false,
    logs: []
  },

  onLoad: async function() {
    // 开发阶段，跳过管理员权限验证
    // this.checkIsAdmin();
    this.addLog('开发模式：直接允许数据初始化操作');
    this.addLog('当前云环境: cloud1-3g9nsaj9f3a1b0ed');
    
    // 检查云环境连接
    this.checkCloudConnection();
  },
  
  // 检查云环境连接
  checkCloudConnection() {
    try {
      this.addLog('正在检查云环境连接...');
      if (!wx.cloud) {
        this.addLog('错误: 请使用 2.2.3 或以上的基础库以使用云能力');
        return;
      }
      
      // 确保云环境已初始化
      if (app.globalData.debug) {
        wx.cloud.init({
          env: 'cloud1-3g9nsaj9f3a1b0ed',
          traceUser: true,
        });
      }
      
      // 测试云函数连接
      wx.cloud.callFunction({
        name: 'getCategories',
        data: { onlyActive: true }
      }).then(res => {
        this.addLog('云函数连接测试成功');
        console.log('云函数测试结果:', res);
      }).catch(err => {
        this.addLog('云函数连接测试失败: ' + JSON.stringify(err));
        console.error('云函数测试失败:', err);
      });
    } catch (error) {
      this.addLog('检查云环境连接出错: ' + error.message);
    }
  },

  // 检查是否为管理员（开发阶段可以不调用）
  async checkIsAdmin() {
    try {
      this.setData({ loading: true });
      const res = await userApi.isAdmin();
      this.setData({ 
        isAdmin: res.isAdmin,
        loading: false 
      });
      
      if (!res.isAdmin) {
        wx.showToast({
          title: '无权访问',
          icon: 'error'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('检查管理员权限失败', error);
      this.addLog('检查管理员权限失败: ' + error.message);
      this.setData({ loading: false });
    }
  },

  // 初始化所有数据
  async initAllData() {
    try {
      this.setData({ loading: true });
      this.addLog('开始统一初始化所有数据...');
      
      // 调用统一初始化函数
      wx.cloud.callFunction({
        name: 'initData',
        data: { action: 'unifyInit' },
        config: {
          env: 'cloud1-3g9nsaj9f3a1b0ed'
        }
      }).then(res => {
        console.log('统一初始化数据结果:', res);
        this.addLog('云函数返回:' + JSON.stringify(res.result || {}));
        
        if (res.result && res.result.success) {
          this.addLog('统一数据初始化成功');
          wx.showToast({
            title: '初始化成功',
            icon: 'success'
          });
          this.setData({ loading: false });
        } else {
          const errorMsg = res.result ? (res.result.message || '未知错误') : '未知错误';
          this.addLog('统一初始化失败: ' + errorMsg + '，尝试回退方案...');
          
          // 如果统一初始化失败，尝试使用cleanDatabase回退方案
          return this.fallbackToCleanDatabase();
        }
      }).catch(err => {
        console.error('统一初始化调用失败:', err);
        this.addLog('统一初始化调用失败:' + JSON.stringify(err) + '，尝试回退方案...');
        
        // 调用失败，尝试使用cleanDatabase回退方案
        return this.fallbackToCleanDatabase();
      });
    } catch (error) {
      console.error('初始化操作出错:', error);
      this.addLog('初始化操作出错: ' + error.message);
      wx.showToast({
        title: '操作出错',
        icon: 'error'
      });
      this.setData({ loading: false });
    }
  },
  
  // 使用cleanDatabase回退方案
  async fallbackToCleanDatabase() {
    this.addLog('正在使用回退方案: cleanDatabase...');
    
    try {
      const cleanRes = await wx.cloud.callFunction({
        name: 'cleanDatabase',
        data: { action: 'init' }
      });
      
      console.log('回退方案结果:', cleanRes);
      this.addLog('回退方案返回: ' + JSON.stringify(cleanRes.result || {}));
      
      if (cleanRes.result && cleanRes.result.success) {
        this.addLog('回退方案初始化成功');
        wx.showToast({
          title: '初始化成功(回退)',
          icon: 'success'
        });
      } else {
        const errorMsg = cleanRes.result ? (cleanRes.result.message || '未知错误') : '未知错误';
        this.addLog('回退方案也失败: ' + errorMsg);
        wx.showToast({
          title: '初始化失败',
          icon: 'error'
        });
      }
    } catch (fallbackErr) {
      console.error('回退方案调用失败:', fallbackErr);
      this.addLog('回退方案调用失败: ' + JSON.stringify(fallbackErr));
      wx.showToast({
        title: '初始化失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 清空所有数据
  async clearAllData() {
    try {
      const res = await wx.showModal({
        title: '警告',
        content: '确定要清空所有数据吗？此操作不可恢复！',
        confirmText: '确定清空',
        confirmColor: '#ff0000',
        cancelText: '取消'
      });
      
      if (res.confirm) {
        this.setData({ loading: true });
        this.addLog('开始清空所有数据...');
        
        // 直接调用云函数，不使用全局方法
        try {
          this.addLog('调用initData云函数(clearAll)...');
          const clearRes = await wx.cloud.callFunction({
            name: 'initData',
            data: {
              action: 'clearAll'
            }
          });
          
          console.log('清空结果:', clearRes);
          this.addLog('云函数返回: ' + JSON.stringify(clearRes.result || {}));
          
          if (clearRes.result && clearRes.result.success) {
            this.addLog('所有数据清空成功');
            wx.showToast({
              title: '清空成功',
              icon: 'success'
            });
          } else {
            const errorMsg = clearRes.result ? clearRes.result.message || '未知错误' : '未知错误';
            this.addLog('所有数据清空失败: ' + errorMsg);
            wx.showToast({
              title: '清空失败',
              icon: 'error'
            });
          }
        } catch (cloudErr) {
          console.error('调用云函数出错:', cloudErr);
          this.addLog('调用云函数出错: ' + JSON.stringify(cloudErr));
          wx.showToast({
            title: '调用云函数失败',
            icon: 'error'
          });
        }
        
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('清空所有数据失败', error);
      this.addLog('清空所有数据出错: ' + error.message);
      wx.showToast({
        title: '清空失败',
        icon: 'error'
      });
      this.setData({ loading: false });
    }
  },

  // 初始化产品数据
  async initProducts() {
    this.addLog('开始初始化商品数据...');
    this.setData({ loading: true });
    
    try {
      // 使用bakeryData的数据直接初始化
      const result = await wx.cloud.callFunction({
        name: 'initData',
        data: { action: 'initProducts' }
      });
      
      console.log('初始化商品结果:', result);
      this.addLog('初始化商品结果: ' + JSON.stringify(result.result || {}));
      
      if (result.result && result.result.success) {
        this.addLog('商品数据初始化成功');
        wx.showToast({
          title: '初始化成功',
          icon: 'success'
        });
        
        // 重新加载首页数据
        const pages = getCurrentPages();
        const indexPage = pages.find(p => p.route === 'pages/index/index');
        if (indexPage) {
          this.addLog('刷新首页数据');
          indexPage.getFreshProducts();
          indexPage.getPopularProducts();
        }
      } else {
        // 如果初始化失败，尝试使用cleanDatabase方法
        this.addLog('initData方法失败，尝试使用cleanDatabase方法...');
        const res = await wx.cloud.callFunction({
          name: 'cleanDatabase',
          data: { action: 'init' }
        });
        
        if (res.result && res.result.success) {
          this.addLog('使用cleanDatabase初始化商品成功');
          wx.showToast({
            title: '初始化成功',
            icon: 'success'
          });
        } else {
          const errorMsg = res.result ? res.result.message || '未知错误' : '未知错误';
          this.addLog('商品数据初始化失败: ' + errorMsg);
          wx.showToast({
            title: '初始化失败',
            icon: 'error'
          });
        }
      }
    } catch (err) {
      console.error('初始化商品数据失败:', err);
      this.addLog('初始化商品数据失败: ' + JSON.stringify(err));
      wx.showToast({
        title: '初始化失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 初始化分类数据
  async initCategories() {
    this.addLog('开始初始化分类数据...');
    this.setData({ loading: true });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'cleanDatabase',
        data: { action: 'init' }
      });
      
      console.log('初始化分类结果:', res);
      this.addLog('初始化分类结果: ' + JSON.stringify(res.result || {}));
      
      if (res.result && res.result.success) {
        this.addLog('分类数据初始化成功');
        wx.showToast({
          title: '初始化成功',
          icon: 'success'
        });
      } else {
        const errorMsg = res.result ? res.result.message || '未知错误' : '未知错误';
        this.addLog('分类数据初始化失败: ' + errorMsg);
        wx.showToast({
          title: '初始化失败',
          icon: 'error'
        });
      }
    } catch (err) {
      console.error('初始化分类数据失败:', err);
      this.addLog('初始化分类数据失败: ' + JSON.stringify(err));
      wx.showToast({
        title: '初始化失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 初始化用户数据
  async initUsers() {
    this.addLog('开始初始化用户数据...');
    this.setData({ loading: true });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'initData',
        data: {
          action: 'initUsers'
        }
      });
      
      console.log('初始化用户结果:', res);
      this.addLog('初始化用户结果: ' + JSON.stringify(res.result || {}));
      
      if (res.result && res.result.success) {
        this.addLog('用户数据初始化成功');
        wx.showToast({
          title: '初始化成功',
          icon: 'success'
        });
      } else {
        const errorMsg = res.result ? res.result.message || '未知错误' : '未知错误';
        this.addLog('用户数据初始化失败: ' + errorMsg);
        wx.showToast({
          title: '初始化失败',
          icon: 'error'
        });
      }
    } catch (err) {
      console.error('初始化用户数据失败:', err);
      this.addLog('初始化用户数据失败: ' + JSON.stringify(err));
      wx.showToast({
        title: '初始化失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 添加日志
  addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    const log = `[${timestamp}] ${message}`;
    const logs = [...this.data.logs, log];
    this.setData({ logs });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 清空日志
  clearLogs() {
    this.setData({ logs: [] });
  }
}) 