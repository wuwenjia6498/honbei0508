// pages/payment/payment.js
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    orderId: '', // 订单ID
    orderAmount: 0, // 订单金额
    remainingTime: 1800, // 订单支付剩余时间（秒）
    timeStr: '30:00', // 格式化后的剩余时间
    countdownTimer: null, // 倒计时定时器
    paymentMethods: [
      { id: 'wxpay', name: '微信支付', icon: '/images/pay/wxpay.png', selected: true },
      { id: 'alipay', name: '支付宝支付', icon: '/images/pay/alipay.png', selected: false },
      { id: 'balance', name: '余额支付', icon: '/images/pay/balance.png', selected: false }
    ],
    selectedMethod: 'wxpay', // 当前选中的支付方式
    isLoading: false // 是否显示加载状态
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 从options中获取订单信息
    if (options && options.orderId) {
      this.setData({
        orderId: options.orderId
      });
      // 获取订单详情
      this.getOrderDetail(options.orderId);
    } else {
      wx.showToast({
        title: '订单信息有误',
        icon: 'none',
        success: () => {
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 开始倒计时
    this.startCountdown();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    // 清除倒计时
    this.clearCountdown();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    // 清除倒计时
    this.clearCountdown();
  },

  /**
   * 获取订单详情
   */
  getOrderDetail: function (orderId) {
    wx.showLoading({
      title: '加载中...',
    });

    wx.cloud.callFunction({
      name: 'getOrderDetail',
      data: {
        orderId: orderId
      }
    }).then(res => {
      wx.hideLoading();
      const { code, data } = res.result || {};
      
      if (code === 0 && data) {
        // 更新订单信息
        this.setData({
          orderAmount: data.totalAmount,
          remainingTime: data.remainingTime || 1800
        });
        
        // 格式化剩余时间
        this.formatRemainingTime();
        
        // 开始倒计时
        this.startCountdown();
      } else {
        wx.showToast({
          title: '获取订单信息失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('获取订单详情失败', err);
      wx.showToast({
        title: '获取订单信息失败',
        icon: 'none'
      });
    });
  },

  /**
   * 开始倒计时
   */
  startCountdown: function () {
    // 先清除可能存在的定时器
    this.clearCountdown();
    
    // 格式化初始时间
    this.formatRemainingTime();
    
    // 设置定时器，每秒更新一次
    const countdownTimer = setInterval(() => {
      let remainingTime = this.data.remainingTime - 1;
      
      if (remainingTime <= 0) {
        // 时间到，清除定时器，提示用户
        this.clearCountdown();
        wx.showModal({
          title: '支付超时',
          content: '订单支付已超时，请重新下单',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
        return;
      }
      
      this.setData({
        remainingTime: remainingTime
      });
      
      // 更新显示的时间
      this.formatRemainingTime();
    }, 1000);
    
    this.setData({
      countdownTimer: countdownTimer
    });
  },

  /**
   * 清除倒计时
   */
  clearCountdown: function () {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
      this.setData({
        countdownTimer: null
      });
    }
  },

  /**
   * 格式化剩余时间
   */
  formatRemainingTime: function () {
    const remainingTime = this.data.remainingTime;
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    
    // 格式化为 MM:SS
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    this.setData({
      timeStr: timeStr
    });
  },

  /**
   * 选择支付方式
   */
  selectPaymentMethod: function (e) {
    const methodId = e.currentTarget.dataset.id;
    
    // 更新支付方式选中状态
    const paymentMethods = this.data.paymentMethods.map(method => {
      return {
        ...method,
        selected: method.id === methodId
      };
    });
    
    this.setData({
      paymentMethods: paymentMethods,
      selectedMethod: methodId
    });
  },

  /**
   * 取消支付
   */
  cancelPayment: function () {
    wx.showModal({
      title: '确认取消支付',
      content: '取消支付后，订单将自动关闭',
      success: (res) => {
        if (res.confirm) {
          // 用户点击确定，取消订单
          this.cancelOrder();
        }
      }
    });
  },

  /**
   * 取消订单
   */
  cancelOrder: function () {
    wx.showLoading({
      title: '取消中...',
    });

    wx.cloud.callFunction({
      name: 'cancelOrder',
      data: {
        orderId: this.data.orderId
      }
    }).then(res => {
      wx.hideLoading();
      const { code, message } = res.result || {};
      
      if (code === 0) {
        wx.showToast({
          title: '订单已取消',
          icon: 'success',
          success: () => {
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          }
        });
      } else {
        wx.showToast({
          title: message || '取消订单失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('取消订单失败', err);
      wx.showToast({
        title: '取消订单失败',
        icon: 'none'
      });
    });
  },

  /**
   * 确认支付
   */
  confirmPayment: function () {
    if (this.data.isLoading) return;
    
    this.setData({
      isLoading: true
    });
    
    // 根据选择的支付方式进行不同的支付处理
    const payMethod = this.data.selectedMethod;
    
    wx.showLoading({
      title: '支付处理中...',
    });
    
    wx.cloud.callFunction({
      name: 'payOrder',
      data: {
        orderId: this.data.orderId,
        payMethod: payMethod
      }
    }).then(res => {
      wx.hideLoading();
      const { code, data, message } = res.result || {};
      
      if (code === 0 && data) {
        if (payMethod === 'wxpay') {
          // 微信支付，调用微信支付API
          const payParams = data.payParams;
          wx.requestPayment({
            ...payParams,
            success: () => {
              // 支付成功
              this.paymentSuccess();
            },
            fail: (err) => {
              console.error('微信支付失败', err);
              wx.showToast({
                title: '支付已取消',
                icon: 'none'
              });
            },
            complete: () => {
              this.setData({
                isLoading: false
              });
            }
          });
        } else if (payMethod === 'alipay') {
          // 支付宝支付，可能需要打开H5页面
          // 简化处理，直接模拟成功
          this.simulatePaymentSuccess();
        } else if (payMethod === 'balance') {
          // 余额支付，直接标记为成功
          this.paymentSuccess();
        }
      } else {
        this.setData({
          isLoading: false
        });
        wx.showToast({
          title: message || '支付失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      this.setData({
        isLoading: false
      });
      wx.hideLoading();
      console.error('支付处理失败', err);
      wx.showToast({
        title: '支付处理失败',
        icon: 'none'
      });
    });
  },

  /**
   * 模拟支付成功（仅用于演示）
   */
  simulatePaymentSuccess: function () {
    wx.showLoading({
      title: '支付处理中...',
    });
    
    // 延时模拟支付过程
    setTimeout(() => {
      wx.hideLoading();
      this.paymentSuccess();
    }, 1500);
  },

  /**
   * 支付成功处理
   */
  paymentSuccess: function () {
    this.setData({
      isLoading: false
    });
    
    wx.showToast({
      title: '支付成功',
      icon: 'success',
      duration: 1500
    });
    
    // 清除倒计时
    this.clearCountdown();
    
    // 延时跳转到支付成功页面
    setTimeout(() => {
      wx.redirectTo({
        url: '/pages/payment/payment-success?orderId=' + this.data.orderId
      });
    }, 1500);
  }
}); 