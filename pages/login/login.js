const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    tipMessage: '登录后可享受更多功能',
    userInfo: null,
    fromPage: '', // 记录从哪个页面跳转过来的
    errorInfo: ''  // 详细错误信息
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 记录来源页面
    if (options.from) {
      this.setData({
        fromPage: options.from
      });
      console.log('登录页面来源:', options.from);
    }
    
    // 检查是否已登录
    if (app.globalData.isLogin && app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        tipMessage: '您已登录，无需重复操作'
      });
      
      // 如果已经登录，自动返回
      if (this.data.fromPage) {
        setTimeout(() => {
          this.navigateBack();
        }, 1000);
      }
    }
    
    // 检查云环境是否已初始化
    if (!wx.cloud) {
      this.setData({
        tipMessage: '当前版本过低，请升级微信版本',
        errorInfo: '微信版本过低，不支持云开发功能'
      });
      return;
    }
  },

  /**
   * 获取用户信息并登录
   */
  getUserProfile: function () {
    if (this.data.loading) return;
    
    this.setData({ 
      loading: true,
      errorInfo: ''
    });
    
    // 调用微信登录接口
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        console.log('获取用户信息成功:', res);
        const userInfo = res.userInfo;
        
        // 调用自定义登录接口
        this.doLogin(userInfo);
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        this.setData({
          loading: false,
          tipMessage: '登录失败，请重试',
          errorInfo: err.errMsg || '用户拒绝授权或授权失败'
        });
        
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        });
      }
    });
  },
  
  /**
   * 执行登录操作
   */
  doLogin: function(userInfo) {
    // 显示加载中
    wx.showLoading({
      title: '登录中...',
      mask: true
    });
    
    // 调用登录云函数
    wx.cloud.callFunction({
      name: 'userService',
      data: {
        action: 'login',
        userInfo: userInfo
      }
    }).then(res => {
      // 隐藏加载中
      wx.hideLoading();
      
      console.log('登录结果:', res);
      
      if (res.result && res.result.success) {
        // 更新全局登录状态
        app.globalData.isLogin = true;
        app.globalData.userInfo = res.result.data;
        app.globalData.openid = res.result.data.openid;
        
        // 更新本地缓存
        wx.setStorageSync('userInfo', res.result.data);
        wx.setStorageSync('openid', res.result.data.openid);
        
        // 更新页面状态
        this.setData({
          userInfo: res.result.data,
          loading: false,
          tipMessage: '登录成功',
          errorInfo: ''
        });
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
        
        // 根据来源页面决定返回策略
        setTimeout(() => {
          this.navigateBack();
        }, 1000);
      } else {
        const errMsg = res.result?.message || '登录失败，请重试';
        console.error('登录失败:', errMsg);
        
        // 尝试检查是否为特定的数据库错误
        const errorDetail = res.result?.error || '';
        let userFriendlyError = errMsg;
        
        if (errorDetail.includes('db') && errorDetail.includes('not defined')) {
          userFriendlyError = '数据库连接失败，请稍后再试';
        }
        
        this.loginFailed(userFriendlyError, JSON.stringify(res.result || {}));
      }
    }).catch(err => {
      // 隐藏加载中
      wx.hideLoading();
      
      console.error('登录失败:', err);
      
      // 尝试给出更友好的错误提示
      let userFriendlyError = '网络错误，请重试';
      if (err.errMsg) {
        if (err.errMsg.includes('cloud function execute timeout')) {
          userFriendlyError = '服务器响应超时，请稍后再试';
        } else if (err.errMsg.includes('not found')) {
          userFriendlyError = '云函数未找到，请检查是否已部署';
        }
      }
      
      this.loginFailed(userFriendlyError, err.errMsg || JSON.stringify(err));
    });
  },
  
  /**
   * 根据来源页面执行不同的返回策略
   */
  navigateBack: function() {
    if (this.data.fromPage === 'address') {
      // 如果是从地址页面过来的，直接返回到地址列表页
      const pages = getCurrentPages();
      console.log('当前页面栈:', pages);
      
      // 检查是否需要重定向而不是返回
      if (pages.length > 1 && pages[pages.length-2].route.includes('address')) {
        // 可以安全地返回
        wx.navigateBack();
      } else {
        // 需要重定向到地址列表页
        wx.redirectTo({
          url: '/pages/address/address-list?select=true'
        });
      }
    } else {
      // 其他页面正常返回
      wx.navigateBack();
    }
  },
  
  /**
   * 登录失败处理
   */
  loginFailed: function(message, detailError = '') {
    this.setData({
      loading: false,
      tipMessage: message,
      errorInfo: detailError
    });
    
    wx.showToast({
      title: message,
      icon: 'none'
    });
  },
  
  /**
   * 返回上一页
   */
  goBack: function() {
    wx.navigateBack();
  },
  
  /**
   * 重试登录
   */
  retryLogin: function() {
    if (this.data.loading) return;
    
    this.setData({
      errorInfo: '',
      tipMessage: '登录后可享受更多功能'
    });
    
    // 直接调用获取用户信息方法
    this.getUserProfile();
  }
}) 