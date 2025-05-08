const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    isLoading: true,
    address: null,
    cartItems: [],
    totalPrice: 0,
    productPrice: 0,
    deliveryFee: 0,
    discount: 0,
    remarks: '',
    deliveryMethod: '快递配送',
    selectedDeliveryTime: '尽快配送',
    canSubmit: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.loadCheckoutData();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 每次页面显示时重新获取地址信息
    this.getDefaultAddress();
  },

  /**
   * 加载结算页数据
   */
  loadCheckoutData: function () {
    const that = this;
    
    // 检查用户是否登录
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo._id) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        success: () => {
          setTimeout(() => {
            wx.navigateTo({
              url: '/pages/login/login',
            });
          }, 1500);
        }
      });
      return;
    }

    // 从缓存获取购物车数据
    wx.getStorage({
      key: 'cartItems',
      success(res) {
        const cartItems = res.data.filter(item => item.checked);
        
        if (!cartItems || cartItems.length === 0) {
          wx.showToast({
            title: '请先选择商品',
            icon: 'none',
            success: () => {
              setTimeout(() => {
                wx.switchTab({
                  url: '/pages/cart/cart',
                });
              }, 1500);
            }
          });
          return;
        }

        // 计算商品总价
        let productPrice = 0;
        cartItems.forEach(item => {
          productPrice += item.price * item.count;
        });

        // 设置配送费用（可根据实际需求调整）
        const deliveryFee = productPrice >= 99 ? 0 : 10;
        
        // 设置折扣（可根据实际需求调整）
        const discount = 0;
        
        // 计算订单总价
        const totalPrice = productPrice + deliveryFee - discount;

        // 更新数据
        that.setData({
          isLoading: false,
          cartItems,
          productPrice,
          deliveryFee,
          discount,
          totalPrice,
          canSubmit: !!that.data.address // 只有有地址时才能提交订单
        });
      },
      fail() {
        // 如果获取不到购物车数据，提示用户并返回
        wx.showToast({
          title: '请先选择商品',
          icon: 'none',
          success: () => {
            setTimeout(() => {
              wx.switchTab({
                url: '/pages/cart/cart',
              });
            }, 1500);
          }
        });
      }
    });
  },

  /**
   * 获取默认地址
   */
  getDefaultAddress: function () {
    const that = this;
    const userInfo = wx.getStorageSync('userInfo');
    
    if (!userInfo || !userInfo._id) {
      return;
    }

    wx.cloud.callFunction({
      name: 'getAddresses',
      data: {
        userId: userInfo._id
      },
      success: res => {
        if (res.result && res.result.data) {
          // 先查找默认地址
          let defaultAddress = res.result.data.find(addr => addr.isDefault);
          
          // 如果没有默认地址，则取第一个地址
          if (!defaultAddress && res.result.data.length > 0) {
            defaultAddress = res.result.data[0];
          }

          that.setData({
            address: defaultAddress || null,
            canSubmit: !!defaultAddress && that.data.cartItems.length > 0
          });
        }
      },
      fail: err => {
        console.error('获取地址失败：', err);
        wx.showToast({
          title: '获取地址失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 前往地址列表页面
   */
  goToAddressList: function () {
    wx.navigateTo({
      url: '/pages/address/address-list?selectMode=true',
    });
  },

  /**
   * 添加新地址
   */
  addNewAddress: function () {
    wx.navigateTo({
      url: '/pages/address/address-edit',
    });
  },

  /**
   * 修改备注信息
   */
  onRemarksChange: function (e) {
    this.setData({
      remarks: e.detail.value
    });
  },

  /**
   * 提交订单
   */
  submitOrder: function () {
    const that = this;
    
    // 检查是否有收货地址
    if (!this.data.address) {
      wx.showToast({
        title: '请选择收货地址',
        icon: 'none'
      });
      return;
    }

    // 检查是否有商品
    if (this.data.cartItems.length === 0) {
      wx.showToast({
        title: '请选择商品',
        icon: 'none'
      });
      return;
    }

    // 显示加载提示
    wx.showLoading({
      title: '提交订单中...',
    });

    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo');

    // 构建订单数据
    const orderData = {
      userId: userInfo._id,
      addressId: this.data.address._id,
      addressInfo: {
        name: this.data.address.name,
        phone: this.data.address.phone,
        province: this.data.address.province,
        city: this.data.address.city,
        district: this.data.address.district,
        detailAddress: this.data.address.detailAddress
      },
      items: this.data.cartItems.map(item => ({
        productId: item.productId,
        productName: item.name,
        productImage: item.image,
        price: item.price,
        count: item.count,
        specs: item.specs || ''
      })),
      productPrice: this.data.productPrice,
      deliveryFee: this.data.deliveryFee,
      discount: this.data.discount,
      totalPrice: this.data.totalPrice,
      remarks: this.data.remarks,
      deliveryMethod: this.data.deliveryMethod,
      deliveryTime: this.data.selectedDeliveryTime,
      status: 'pending', // 待支付
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 调用云函数创建订单
    wx.cloud.callFunction({
      name: 'createOrder',
      data: orderData,
      success: res => {
        wx.hideLoading();
        
        if (res.result && res.result.code === 0) {
          // 清除购物车中已下单的商品
          that.removeCheckedItemsFromCart();
          
          // 订单创建成功，跳转到支付页面
          wx.navigateTo({
            url: `/pages/payment/payment?orderId=${res.result.data._id}&totalPrice=${that.data.totalPrice}`,
          });
        } else {
          wx.showToast({
            title: res.result?.message || '创建订单失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('提交订单失败：', err);
        wx.showToast({
          title: '提交订单失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 从购物车中移除已下单的商品
   */
  removeCheckedItemsFromCart: function () {
    wx.getStorage({
      key: 'cartItems',
      success(res) {
        const cartItems = res.data || [];
        const remainingItems = cartItems.filter(item => !item.checked);
        
        wx.setStorage({
          key: 'cartItems',
          data: remainingItems
        });
      }
    });
  }
}); 