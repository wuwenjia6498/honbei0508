const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    tipMessage: '登录后可享受更多功能',
    userInfo: null,
    fromPage: '' // 记录从哪个页面跳转过来的
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
  },

  /**
   * 获取用户信息并登录
   */
  getUserProfile: function () {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
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
          tipMessage: '登录失败，请重试'
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
    // 调用登录云函数
    wx.cloud.callFunction({
      name: 'userService',
      data: {
        action: 'login',
        userData: userInfo
      }
    }).then(res => {
      console.log('登录成功:', res);
      
      if (res.result && res.result.success) {
        // 更新全局登录状态
        app.globalData.isLogin = true;
        app.globalData.userInfo = res.result.data;
        
        // 更新页面状态
        this.setData({
          userInfo: res.result.data,
          loading: false,
          tipMessage: '登录成功'
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
        this.loginFailed('登录失败，请重试');
      }
    }).catch(err => {
      console.error('登录失败:', err);
      this.loginFailed('网络错误，请重试');
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
  loginFailed: function(message) {
    this.setData({
      loading: false,
      tipMessage: message
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
  }
}) 