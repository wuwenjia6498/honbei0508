// pages/admin/login/login.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    username: '',
    password: '',
    errorMessage: '',
    loading: false
  },

  /**
   * 输入用户名
   */
  onUsernameInput: function(e) {
    this.setData({
      username: e.detail.value,
      errorMessage: ''
    });
  },

  /**
   * 输入密码
   */
  onPasswordInput: function(e) {
    this.setData({
      password: e.detail.value,
      errorMessage: ''
    });
  },

  /**
   * 登录操作
   */
  login: function() {
    // 显示加载
    this.setData({ loading: true });
    
    // 临时开发测试用：直接登录，不验证用户名和密码
    // 设置登录状态
    wx.setStorageSync('adminLoggedIn', true);
    
    // 跳转到管理员面板
    wx.navigateTo({
      url: '/pages/admin/dashboard/dashboard',
      success: () => {
        // 登录成功后重置loading状态
        this.setData({ loading: false });
      }
    });
  }
}) 