const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    addresses: [],
    isLoading: false,
    isEmpty: false,
    isSelectionMode: false // 是否为选择地址模式
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 检查是否是从结算页面跳转过来选择地址
    if (options.select && options.select === 'true') {
      this.setData({
        isSelectionMode: true
      });
      wx.setNavigationBarTitle({
        title: '选择收货地址'
      });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 检查全局变量，判断是否需要刷新地址列表
    if (app.globalData && app.globalData.addressListNeedRefresh) {
      app.globalData.addressListNeedRefresh = false;
    }
    this.loadAddresses();
  },

  /**
   * 获取地址列表数据
   */
  loadAddresses: function () {
    const that = this;
    
    this.setData({
      isLoading: true,
      isEmpty: false
    });

    // 先检查用户是否登录
    if (!app.globalData.isLogin) {
      console.log('用户未登录，跳转到登录页面');
      this.setData({
        isLoading: false,
        isEmpty: true
      });
      
      // 立即跳转到登录页面，并设置返回参数
      wx.navigateTo({
        url: '/pages/login/login?from=address'
      });
      return;
    }

    // 调用云函数获取地址列表
    wx.cloud.callFunction({
      name: 'addressService',
      data: {
        action: 'getAddresses'
      }
    }).then(res => {
      console.log('获取地址列表成功', res.result);
      
      if (res.result && res.result.code === 0) {
        that.setData({
          addresses: res.result.data || [],
          isEmpty: (res.result.data || []).length === 0,
          isLoading: false
        });
      } else {
        wx.showToast({
          title: res.result?.message || '获取地址列表失败',
          icon: 'none'
        });
        that.setData({
          isLoading: false,
          isEmpty: true
        });
      }
    }).catch(err => {
      console.error('获取地址列表失败', err);
      wx.showToast({
        title: '获取地址列表失败',
        icon: 'none'
      });
      that.setData({
        isLoading: false,
        isEmpty: true
      });
    });
  },

  /**
   * 添加新地址
   */
  addAddress: function () {
    wx.navigateTo({
      url: '/pages/address/address-edit'
    });
  },

  /**
   * 编辑地址
   */
  editAddress: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/address/address-edit?id=${id}`
    });
  },

  /**
   * 删除地址
   */
  deleteAddress: function (e) {
    const id = e.currentTarget.dataset.id;
    const that = this;

    wx.showModal({
      title: '提示',
      content: '确定要删除这个地址吗？',
      success: res => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'addressService',
            data: {
              action: 'deleteAddress',
              id: id
            },
            success: res => {
              console.log('删除地址结果', res.result);
              const { code, message } = res.result;
              
              if (code === 0) {
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                });
                // 重新加载地址列表
                that.loadAddresses();
              } else {
                wx.showToast({
                  title: message || '删除失败',
                  icon: 'none'
                });
              }
            },
            fail: err => {
              console.error('删除地址失败', err);
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  /**
   * 设为默认地址
   */
  setDefaultAddress: function (e) {
    const id = e.currentTarget.dataset.id;
    const that = this;

    wx.showLoading({
      title: '设置中...'
    });

    wx.cloud.callFunction({
      name: 'addressService',
      data: { 
        action: 'setDefaultAddress',
        addressId: id 
      }
    }).then(res => {
      wx.hideLoading();
      console.log('设置默认地址结果', res.result);
      
      if (res.result && res.result.code === 0) {
        wx.showToast({
          title: '设置成功',
          icon: 'success'
        });
        // 重新加载地址列表
        that.loadAddresses();
      } else {
        wx.showToast({
          title: res.result?.message || '设置失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('设置默认地址失败', err);
      wx.showToast({
        title: '设置失败',
        icon: 'none'
      });
    });
  },

  /**
   * 选择地址并返回
   */
  selectAddress: function (e) {
    if (!this.data.isSelectionMode) {
      return;
    }

    const id = e.currentTarget.dataset.id;
    const selectedAddress = this.data.addresses.find(item => item._id === id);
    
    if (selectedAddress) {
      // 将选中的地址信息存储到本地
      wx.setStorageSync('selectedAddress', selectedAddress);
      
      // 设置全局变量，表示已选择了地址
      if (app.globalData) {
        app.globalData.selectedAddressId = id;
      }
      
      // 返回上一页
      wx.navigateBack();
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh: function () {
    this.loadAddresses();
    wx.stopPullDownRefresh();
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '收货地址管理',
      path: '/pages/address/address-list'
    };
  }
}); 