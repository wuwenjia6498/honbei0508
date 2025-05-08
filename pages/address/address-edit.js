const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    address: {
      name: '',
      phone: '',
      region: ['', '', ''],
      detail: '',
      postalCode: '',
      isDefault: false,
      _id: '',  // 用于编辑现有地址
      _openid: ''  // 用户openid
    },
    region: ['', '', ''],
    regionSelected: false,
    isNewAddress: true,
    submitting: false,
    errors: {},
    addressId: ''  // 地址ID
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    if (options && options.id) {
      this.setData({
        isNewAddress: false,
        addressId: options.id
      });
      this.loadAddressDetail(options.id);
    }
  },

  /**
   * 加载地址详情
   */
  loadAddressDetail: function (addressId) {
    wx.showLoading({
      title: '加载中...',
    });

    wx.cloud.callFunction({
      name: 'addressService',
      data: { 
        action: 'getAddressById',
        addressId: addressId
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.code === 0) {
        const addressData = res.result.data;
        
        const address = {
          name: addressData.name || '',
          phone: addressData.phone || '',
          region: addressData.region || ['', '', ''],
          detail: addressData.detailAddress || '',
          postalCode: addressData.postalCode || '',
          isDefault: addressData.isDefault || false,
          _id: addressData._id || '',
          _openid: addressData._openid || ''
        };
        
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo && userInfo.openid && address._openid && userInfo.openid !== address._openid) {
          wx.showToast({
            title: '无权编辑此地址',
            icon: 'none'
          });
          setTimeout(() => wx.navigateBack(), 1500);
          return;
        }
        
        this.setData({
          address: address,
          region: addressData.region || ['', '', ''],
          regionSelected: addressData.region && addressData.region[0] ? true : false
        });
      } else {
        wx.showToast({
          title: res.result?.message || '获取地址详情失败',
          icon: 'none'
        });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '获取地址详情失败: ' + err.message,
        icon: 'none'
      });
      console.error('获取地址详情失败:', err);
      setTimeout(() => wx.navigateBack(), 1500);
    });
  },

  /**
   * 输入框事件处理
   */
  onNameInput: function (e) {
    this.setData({
      'address.name': e.detail.value,
      'errors.name': ''
    });
    console.log('收货人输入:', e.detail.value);
  },

  onPhoneInput: function (e) {
    this.setData({
      'address.phone': e.detail.value,
      'errors.phone': ''
    });
  },

  onRegionChange: function (e) {
    this.setData({
      region: e.detail.value,
      regionSelected: true,
      'errors.region': ''
    });
  },

  onDetailInput: function (e) {
    this.setData({
      'address.detail': e.detail.value,
      'errors.detail': ''
    });
  },

  onPostalCodeInput: function (e) {
    this.setData({
      'address.postalCode': e.detail.value,
      'errors.postalCode': ''
    });
  },

  /**
   * 设为默认地址事件处理
   */
  onDefaultChange: function (e) {
    this.setData({
      'address.isDefault': e.detail.value
    });
  },

  /**
   * 表单验证
   */
  validateForm: function () {
    let errors = {};
    let isValid = true;

    if (!this.data.address.name.trim()) {
      errors.name = '请输入收货人姓名';
      isValid = false;
    }

    const phoneReg = /^1[3-9]\d{9}$/;
    if (!this.data.address.phone) {
      errors.phone = '请输入手机号码';
      isValid = false;
    } else if (!phoneReg.test(this.data.address.phone)) {
      errors.phone = '请输入有效的11位手机号码';
      isValid = false;
    }

    if (!this.data.regionSelected || !this.data.region[0]) {
      errors.region = '请选择所在地区';
      isValid = false;
    }

    if (!this.data.address.detail.trim()) {
      errors.detail = '请输入详细地址';
      isValid = false;
    }

    if (this.data.address.postalCode) {
      const postalCodeReg = /^\d{6}$/;
      if (!postalCodeReg.test(this.data.address.postalCode)) {
        errors.postalCode = '邮政编码必须为6位数字';
        isValid = false;
      }
    }

    this.setData({
      errors: errors
    });

    return isValid;
  },

  /**
   * 保存地址
   */
  saveAddress: function () {
    if (this.data.submitting) return;
    
    // 调试信息：显示当前表单数据
    console.log('当前表单数据:', JSON.stringify({
      name: this.data.address.name,
      phone: this.data.address.phone,
      region: this.data.region,
      detail: this.data.address.detail,
      isDefault: this.data.address.isDefault
    }));
    
    if (!this.validateForm()) {
      wx.showToast({
        title: '请完善地址信息',
        icon: 'none'
      });
      return;
    }

    this.setData({ submitting: true });
    
    wx.showLoading({
      title: '保存中...',
    });

    const addressData = {
      name: this.data.address.name,
      phone: this.data.address.phone,
      region: this.data.region,
      detailAddress: this.data.address.detail,
      postalCode: this.data.address.postalCode,
      isDefault: this.data.address.isDefault
    };

    // 调用保存地址云函数
    console.log('准备发送地址数据:', JSON.stringify(addressData));
    
    // 准备要发送的数据
    const addressInfo = {
      name: "" + this.data.address.name.trim(),
      phone: this.data.address.phone,
      region: this.data.region,
      detailAddress: this.data.address.detail,
      postalCode: this.data.address.postalCode,
      isDefault: this.data.address.isDefault
    };
    
    let requestData = {};
    
    if (this.data.isNewAddress) {
      // 新增地址
      requestData = {
        action: 'addAddress',
        address: addressInfo
      };
    } else {
      // 修改地址
      requestData = {
        action: 'updateAddress',
        addressId: this.data.addressId,
        address: addressInfo
      };
    }
    
    console.log('最终发送的参数:', JSON.stringify(requestData));
    
    wx.cloud.callFunction({
      name: 'addressService',
      data: requestData
    }).then(res => {
      wx.hideLoading();
      this.setData({ submitting: false });
      
      console.log('收到地址保存响应:', JSON.stringify(res.result));
      
      if (res.result && res.result.code === 0) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        
        // 通知地址列表页面刷新
        if (getApp().globalData) {
          getApp().globalData.addressListNeedRefresh = true;
        }

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: res.result?.message || '保存失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      this.setData({ submitting: false });
      
      wx.showToast({
        title: '保存失败: ' + err.message,
        icon: 'none'
      });
      console.error('保存地址失败:', err);
    });
  },

  /**
   * 删除地址
   */
  deleteAddress: function () {
    if (this.data.isNewAddress) return;
    
    wx.showModal({
      title: '提示',
      content: '确定要删除这个地址吗？',
      success: (res) => {
        if (res.confirm) {
          this.performDeleteAddress();
        }
      }
    });
  },

  performDeleteAddress: function () {
    wx.showLoading({
      title: '删除中...',
    });

    wx.cloud.callFunction({
      name: 'addressService',
      data: { 
        action: 'deleteAddress',
        addressId: this.data.addressId 
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.code === 0) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        
        // 通知地址列表页面刷新
        if (getApp().globalData) {
          getApp().globalData.addressListNeedRefresh = true;
        }
        
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: res.result?.message || '删除失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '删除失败: ' + err.message,
        icon: 'none'
      });
      console.error('删除地址失败:', err);
    });
  },

  // 输入框失去焦点时再次确保数据已保存
  onNameBlur: function (e) {
    this.setData({
      'address.name': e.detail.value,
      'errors.name': ''
    });
    console.log('收货人失去焦点, 当前值:', e.detail.value);
  }
}); 