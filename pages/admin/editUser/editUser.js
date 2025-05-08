// 获取应用实例
const app = getApp();

Page({
  data: {
    userId: '',
    userInfo: null,
    isLoading: true,
    formData: {
      nickname: '',
      phone: '',
      level: 'normal',
      status: 'active'
    },
    levelOptions: [
      { value: 'normal', label: '普通会员' },
      { value: 'premium', label: '高级会员' }
    ],
    statusOptions: [
      { value: 'active', label: '正常' },
      { value: 'inactive', label: '禁用' }
    ]
  },

  onLoad: function(options) {
    if (options.id) {
      this.setData({
        userId: options.id
      });
      this.loadUserInfo(options.id);
    } else {
      wx.showToast({
        title: '未找到用户ID',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    }
  },

  loadUserInfo: async function(userId) {
    try {
      console.log('加载用户信息:', userId);
      const res = await wx.cloud.callFunction({
        name: 'userManager',
        data: {
          action: 'getUserDetail',
          data: {
            userId
          }
        }
      });
      console.log('获取用户信息结果:', res);

      if (res.result && res.result.success) {
        const userInfo = res.result.data;
        this.setData({
          userInfo,
          isLoading: false,
          formData: {
            nickname: userInfo.nickname || '',
            phone: userInfo.phone || '',
            level: userInfo.level || 'normal',
            status: userInfo.status || 'active'
          }
        });
      } else {
        throw new Error(res.result?.message || '获取用户信息失败');
      }
    } catch (error) {
      console.error('加载用户信息失败：', error);
      wx.showToast({
        title: '加载用户信息失败',
        icon: 'none',
        duration: 2000
      });
      this.setData({ isLoading: false });
    }
  },

  // 表单输入事件处理
  handleInput: function(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 选择器改变事件处理
  handlePickerChange: function(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`formData.${field}`]: this.data[`${field}Options`][value].value
    });
  },

  // 提交表单
  submitForm: async function() {
    if (!this.validateForm()) {
      return;
    }

    try {
      wx.showLoading({ title: '保存中...' });
      
      const res = await wx.cloud.callFunction({
        name: 'userManager',
        data: {
          action: 'updateUser',
          data: {
            userId: this.data.userId,
            userData: this.data.formData
          }
        }
      });

      if (res.result && res.result.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 2000
        });
        
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      } else {
        throw new Error(res.result?.message || '更新用户信息失败');
      }
    } catch (error) {
      console.error('保存用户信息失败：', error);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none',
        duration: 2000
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 表单验证
  validateForm: function() {
    if (!this.data.formData.nickname) {
      wx.showToast({
        title: '请输入用户昵称',
        icon: 'none'
      });
      return false;
    }
    
    if (!this.data.formData.phone) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      });
      return false;
    }
    
    // 简单的手机号格式验证
    const phoneRegex = /^1\d{10}$/;
    if (!phoneRegex.test(this.data.formData.phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  // 返回上一页
  goBack: function() {
    wx.navigateBack();
  }
}); 