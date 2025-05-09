// pages/checkout/checkout.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 配送地址
    address: null,
    // 配送时间
    deliveryTime: '今日 18:00-19:00',
    // 通知信息
    notification: '今日供货商品将于您选择的时间内内新鲜烘焙，保证最佳口感。21:00以下单可当日配送。',
    // 订单商品
    orderItems: [],
    // 支付方式
    paymentMethods: [
      { id: 'wechat', name: '微信支付', icon: 'wechat', selected: true },
      { id: 'alipay', name: '支付宝', icon: 'alipay', selected: false },
      { id: 'cod', name: '货到付款', icon: 'cash', selected: false }
    ],
    // 订单金额
    orderAmount: {
      goodsTotal: 0,
      delivery: 8.00,
      discount: 0,
      total: 0
    },
    isLoading: true,
    cartData: null,
    remarks: '',
    remarksLength: 0,
    
    // 配送时间选择相关
    showTimePopup: false,    // 是否显示配送时间弹出层
    dateOptions: [],         // 日期选项
    timeOptions: [],         // 时间段选项
    selectedDateIndex: 0,    // 选中的日期索引
    selectedTimeIndex: -1,   // 选中的时间段索引
    canConfirm: false,       // 是否可以确认时间选择
    deliveryTimeData: null,  // 配送时间数据
    
    // 地址弹出层相关
    showAddressPopup: false, // 是否显示地址弹出层
    addressList: [],         // 地址列表
    addressLoading: false,   // 地址加载状态
    addressEmpty: false,     // 地址列表是否为空
    selectedAddressId: '',   // 当前选中的地址ID
    
    // 备注弹出层相关
    showRemarksPopup: false, // 是否显示备注弹出层
    tempRemarks: ''          // 临时存储备注内容
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    console.log('结算页面onLoad被调用，options:', options);
    
    // 显示加载中提示
    wx.showLoading({
      title: '加载中...',
    });
    
    // 获取默认地址
    this.getDefaultAddress();
    
    // 初始化配送时间选项
    this.initDeliveryTimeOptions();
    
    // 检查URL参数中是否有备注信息标记
    if (options.hasRemarks === 'true') {
      console.log('URL参数指示有备注信息，将尝试获取');
    }
    
    // 先尝试获取单独存储的备注信息
    try {
      const remarks = wx.getStorageSync('orderRemarks');
      if (remarks) {
        console.log('从orderRemarks获取到备注信息:', remarks);
        this.setData({
          remarks: remarks,
          remarksLength: remarks.length
        });
        // 使用后清除缓存
        wx.removeStorageSync('orderRemarks');
      }
    } catch (error) {
      console.error('获取备注信息失败:', error);
    }
    
    // 尝试获取从购物车页面传过来的结算数据
    try {
      const checkoutData = wx.getStorageSync('checkoutData');
      console.log('从缓存获取的结算数据:', checkoutData);
      
      if (checkoutData && checkoutData.items && checkoutData.items.length > 0) {
        // 处理结算数据
        this.processCheckoutData(checkoutData);
      } else {
        console.log('缓存中没有有效的结算数据，将尝试调用云函数获取购物车数据');
        this.showNoItemsToast();
      }
    } catch (error) {
      console.error('获取缓存数据失败:', error);
      this.showNoItemsToast();
    }
  },
  
  /**
   * 返回上一页
   */
  goBack: function() {
    console.log('返回按钮被点击');
    try {
      // 获取页面栈信息
      const pages = getCurrentPages();
      console.log('当前页面栈:', pages.length);
      
      if (pages.length > 1) {
        // 有上一页时，正常返回
        wx.navigateBack({
          delta: 1,
          fail: (err) => {
            console.error('导航返回失败:', err);
            // 导航失败时尝试使用redirectTo
            wx.redirectTo({
              url: '/pages/cart/cart'
            });
          }
        });
      } else {
        // 没有上一页时，跳转到购物车
        wx.switchTab({
          url: '/pages/cart/cart'
        });
      }
    } catch (err) {
      console.error('返回操作异常:', err);
      // 出错时默认跳转到购物车
      wx.switchTab({
        url: '/pages/cart/cart'
      });
    }
  },
  
  /**
   * 阻止穿透滑动
   */
  preventTouchMove: function() {
    return false;
  },
  
  /**
   * 初始化配送时间选项
   */
  initDeliveryTimeOptions: function() {
    // 初始化日期选项
    const dateOptions = [];
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const now = new Date();
    const currentHour = now.getHours();
    
    // 判断今天是否还能配送（21点前可以当天配送）
    const canDeliverToday = currentHour < 21;
    
    // 生成未来3天的日期选项
    for (let i = canDeliverToday ? 0 : 1; i < (canDeliverToday ? 3 : 4); i++) {
      const date = new Date();
      date.setDate(now.getDate() + i);
      
      const day = dayNames[date.getDay()];
      const monthDay = `${date.getMonth() + 1}月${date.getDate()}日`;
      
      dateOptions.push({
        date: monthDay,
        day: i === 0 ? '今天' : (i === 1 ? '明天' : day),
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      });
    }
    
    this.setData({ 
      dateOptions,
      selectedDateIndex: 0
    });
    
    // 初始化时间段选项
    this.updateTimeOptions();
  },
  
  /**
   * 根据选中的日期更新可选时间段
   */
  updateTimeOptions: function() {
    const now = new Date();
    const currentHour = now.getHours();
    const selectedDateIndex = this.data.selectedDateIndex;
    const isToday = selectedDateIndex === 0 && this.data.dateOptions[0]?.day === '今天';
    
    // 定义时间段选项
    const timeSlots = [
      { time: '09:00-11:00', disabled: isToday && currentHour >= 8, tag: '' },
      { time: '11:00-13:00', disabled: isToday && currentHour >= 10, tag: '' },
      { time: '13:00-15:00', disabled: isToday && currentHour >= 12, tag: '' },
      { time: '15:00-17:00', disabled: isToday && currentHour >= 14, tag: '' },
      { time: '17:00-19:00', disabled: isToday && currentHour >= 16, tag: '热门' },
      { time: '19:00-21:00', disabled: isToday && currentHour >= 18, tag: '热门' }
    ];
    
    // 更新数据
    this.setData({
      timeOptions: timeSlots,
      selectedTimeIndex: -1,  // 重置已选时间段
      canConfirm: false       // 重置确认状态
    });
  },
  
  /**
   * 显示配送时间弹出层
   */
  showDeliveryTimePopup: function() {
    this.setData({
      showTimePopup: true
    });
  },
  
  /**
   * 隐藏配送时间弹出层
   */
  hideDeliveryTimePopup: function() {
    this.setData({
      showTimePopup: false
    });
  },
  
  /**
   * 选择日期
   */
  selectDate: function(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      selectedDateIndex: index
    });
    
    // 更新时间段选项
    this.updateTimeOptions();
  },
  
  /**
   * 选择时间段
   */
  selectTime: function(e) {
    const index = e.currentTarget.dataset.index;
    
    // 检查时间段是否可选
    if (this.data.timeOptions[index].disabled) {
      return;
    }
    
    this.setData({
      selectedTimeIndex: index,
      canConfirm: true  // 选中时间段后可以确认
    });
  },
  
  /**
   * 确认配送时间选择
   */
  confirmDeliveryTime: function() {
    if (!this.data.canConfirm) return;
    
    const selectedDate = this.data.dateOptions[this.data.selectedDateIndex];
    const selectedTime = this.data.timeOptions[this.data.selectedTimeIndex];
    
    if (!selectedDate || !selectedTime) return;
    
    // 组合配送信息
    const deliveryInfo = `${selectedDate.day} ${selectedTime.time}`;
    
    // 保存配送时间信息
    const deliveryTimeData = {
      display: deliveryInfo,
      date: selectedDate.value,
      time: selectedTime.time
    };
    
    this.setData({
      deliveryTime: deliveryInfo,
      deliveryTimeData: deliveryTimeData,
      showTimePopup: false
    });
  },
  
  /**
   * 显示没有商品提示并返回购物车页面
   */
  showNoItemsToast: function() {
    wx.hideLoading();
    this.setData({ isLoading: false });
    
    wx.showToast({
      title: '请先选择商品',
      icon: 'none',
      success: () => {
        // 延迟返回购物车页面
        setTimeout(() => {
          wx.navigateBack({
            delta: 1
          });
        }, 1500);
      }
    });
  },
  
  /**
   * 获取默认地址
   */
  getDefaultAddress: function() {
    const app = getApp();
    if (!app.globalData.isLogin) {
      this.setData({
        address: {
          name: '请先登录',
          phone: '',
          address: '点击登录账号'
        }
      });
      return;
    }
    
    wx.cloud.callFunction({
      name: 'userService',
      data: {
        action: 'getDefaultAddress'
      },
      success: res => {
        if (res.result && res.result.success && res.result.data) {
          this.setData({
            address: res.result.data
          });
        } else {
          // 没有默认地址，使用空地址或示例地址
          this.setData({
            address: {
              name: '请添加收货地址',
              phone: '',
              address: '点击添加收货地址'
            }
          });
        }
      },
      fail: err => {
        console.error('获取默认地址失败', err);
        this.setData({
          address: {
            name: '获取地址失败',
            phone: '',
            address: '点击重试'
          }
        });
      }
    });
  },
  
  /**
   * 获取购物车数据
   */
  getCartData: function() {
    wx.cloud.callFunction({
      name: 'cartService',
      data: {
        action: 'getCart'
      },
      success: res => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          const cartData = res.result.data;
          
          // 从购物车页面传递过来的是已经选中的商品，所以这里直接取所有商品
          let orderItems = [];
          let goodsTotal = 0;
          
          // 如果没有商品，则返回购物车页面
          if (!cartData.cartItems || cartData.cartItems.length === 0) {
            wx.showToast({
              title: '购物车为空',
              icon: 'none',
              success: () => {
                setTimeout(() => {
                  wx.navigateBack();
                }, 1500);
              }
            });
            return;
          }
          
          cartData.cartItems.forEach(item => {
            if (item.product) {
              // 临时将所有商品都视为已选中
              goodsTotal += item.product.price * item.quantity;
              orderItems.push({
                id: item._id,
                productId: item.productId,
                name: item.product.name,
                image: item.product.image,
                price: item.product.price,
                count: item.quantity,
                specs: item.product.spec || '标准规格'
              });
            }
          });
          
          if (orderItems.length === 0) {
            wx.showToast({
              title: '购物车商品数据异常',
              icon: 'none',
              success: () => {
                setTimeout(() => {
                  wx.navigateBack();
                }, 1500);
              }
            });
            return;
          }
          
          // 应用优惠规则（示例：满80减10）
          let discount = 0;
          if (goodsTotal >= 80) {
            discount = 10;
          }
          
          // 计算总金额
          const total = goodsTotal + this.data.orderAmount.delivery - discount;
          
          this.setData({
            orderItems,
            cartData,
            orderAmount: {
              goodsTotal: goodsTotal.toFixed(2),
              delivery: this.data.orderAmount.delivery.toFixed(2),
              discount: discount.toFixed(2),
              total: total.toFixed(2)
            },
            isLoading: false
          });
        } else {
          console.error('获取购物车数据失败', res);
          wx.showToast({
            title: '获取购物车数据失败',
            icon: 'none'
          });
          this.setData({
            isLoading: false
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('调用获取购物车云函数失败', err);
        wx.showToast({
          title: '获取购物车数据失败',
          icon: 'none'
        });
        this.setData({
          isLoading: false
        });
      }
    });
  },

  /**
   * 选择支付方式
   */
  selectPayment: function(e) {
    const id = e.currentTarget.dataset.id;
    const paymentMethods = this.data.paymentMethods.map(item => {
      return {
        ...item,
        selected: item.id === id
      };
    });
    this.setData({ paymentMethods });
  },

  /**
   * 确认支付
   */
  confirmPayment: function() {
    if (!this.data.address || this.data.address.name === '请添加收货地址' || this.data.address.name === '请先登录') {
      wx.showToast({
        title: '请先添加收货地址',
        icon: 'none'
      });
      return;
    }
    
    // 检查订单商品
    if (this.data.orderItems.length === 0) {
      wx.showToast({
        title: '订单中没有商品',
        icon: 'none'
      });
      return;
    }
    
    console.log('开始创建订单...');
    
    // 显示加载提示
    wx.showLoading({
      title: '正在创建订单...',
    });
    
    // 准备购物车中选中的商品
    const products = this.data.orderItems.map(item => ({
      productId: item.productId,
      quantity: item.count
    }));
    
    // 选中的支付方式
    const selectedPayment = this.data.paymentMethods.find(method => method.selected);
    
    // 确保地址对象格式正确
    let addressData = this.data.address;
    // 如果address对象中包含fullAddress字段，则使用它
    if (addressData.fullAddress) {
      addressData = addressData.fullAddress;
    }
    
    // 准备更完整的订单数据
    const orderData = {
      action: 'createOrder',
      products: products,
      address: addressData,
      deliveryTime: this.data.deliveryTimeData || { display: this.data.deliveryTime },
      paymentMethod: selectedPayment ? selectedPayment.id : 'wechat',
      clearCart: true, // 下单后清空购物车中的这些商品
      remarks: this.data.remarks || '' // 添加备注信息
    };
    
    console.log('发送到云函数的订单数据:', orderData);
    
    // 创建订单
    wx.cloud.callFunction({
      name: 'orderService',
      data: orderData,
      success: res => {
        wx.hideLoading();
        console.log('创建订单响应:', res);
        
        if (res.result && res.result.success) {
          // 清除结算缓存数据
          wx.removeStorageSync('checkoutData');
          
          // 更新订单状态为已支付
          try {
            wx.cloud.callFunction({
              name: 'orderStatusUpdate',
              data: {
                orderId: res.result.data._id,
                status: 'paid'
              }
            });
          } catch (err) {
            console.error('更新订单状态失败，但继续执行:', err);
          }
          
          // 显示成功提示
          wx.showToast({
            title: '订单创建成功',
            icon: 'success',
            duration: 1500,
            success: function() {
              // 成功后显示一个确认提示，解释正在跳转
              setTimeout(() => {
                wx.showModal({
                  title: '支付成功',
                  content: '订单已创建成功，即将跳转到个人中心页查看订单',
                  showCancel: false,
                  success: function() {
                    // 关闭对话框后直接跳转
                    wx.switchTab({
                      url: '/pages/profile/profile',
                      success: function() {
                        console.log('成功跳转到我的页面');
                        // 跳转成功后，设置标志告诉用户中心页面去订单列表
                        wx.setStorageSync('goToOrderList', true);
                      }
                    });
                  }
                });
              }, 500);
            }
          });
        } else {
          // 订单创建失败处理
          console.error('创建订单失败', res);
          wx.showToast({
            title: '创建订单失败',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('调用创建订单云函数失败', err);
        
        wx.showToast({
          title: '创建订单失败，请稍后重试',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
    // 检查是否从地址列表页面选择了地址
    try {
      const selectedAddress = wx.getStorageSync('selectedAddress');
      if (selectedAddress) {
        console.log('获取到选择的地址:', selectedAddress);
        // 更新地址信息
        this.setData({
          address: {
            id: selectedAddress._id,
            name: selectedAddress.name,
            phone: selectedAddress.phone,
            address: `${selectedAddress.region[0]} ${selectedAddress.region[1]} ${selectedAddress.region[2]} ${selectedAddress.detailAddress}`,
            isDefault: selectedAddress.isDefault,
            // 保存完整地址信息，用于提交订单
            fullAddress: selectedAddress
          }
        });
        // 使用后清除缓存
        wx.removeStorageSync('selectedAddress');
      }
    } catch (e) {
      console.error('获取选择的地址信息失败', e);
    }

    // 检查是否从配送时间页面返回，获取配送时间信息
    try {
      const selectedDeliveryTime = wx.getStorageSync('selectedDeliveryTime');
      if (selectedDeliveryTime) {
        console.log('获取到选择的配送时间:', selectedDeliveryTime);
        this.setData({
          deliveryTime: selectedDeliveryTime.display,
          // 保存完整配送时间信息，用于提交订单
          deliveryTimeData: selectedDeliveryTime
        });
        // 使用后清除缓存
        wx.removeStorageSync('selectedDeliveryTime');
      }
    } catch (e) {
      console.error('获取选择的配送时间信息失败', e);
    }

    // 检查是否从备注页面返回，获取备注信息
    try {
      const remarks = wx.getStorageSync('orderRemarks');
      if (remarks !== undefined && remarks !== null) {
        console.log('onShow中获取到备注信息:', remarks);
        this.setData({
          remarks: remarks,
          remarksLength: remarks ? remarks.length : 0
        });
        // 使用后清除
        wx.removeStorageSync('orderRemarks');
      }
    } catch (e) {
      console.error('获取备注信息失败', e);
    }
  },

  /**
   * 跳转到地址选择页面
   */
  navigateToAddress: function() {
    const app = getApp();
    if (!app.globalData.isLogin) {
      // 如果未登录，先跳转到登录页面
      wx.navigateTo({
        url: '/pages/login/login?from=checkout'
      });
      return;
    }
    
    // 已登录，直接跳转到地址选择页面
    wx.navigateTo({
      url: '/pages/address/address-list?select=true'
    });
  },

  /**
   * 显示备注弹出层
   */
  showRemarksPopup: function() {
    this.setData({
      showRemarksPopup: true,
      tempRemarks: this.data.remarks
    });
  },
  
  /**
   * 隐藏备注弹出层
   */
  hideRemarksPopup: function() {
    this.setData({
      showRemarksPopup: false
    });
  },
  
  /**
   * 监听备注输入
   */
  onRemarksInput: function(e) {
    const value = e.detail.value;
    this.setData({
      tempRemarks: value,
      remarksLength: value.length
    });
  },
  
  /**
   * 选择快捷备注
   */
  selectQuickRemark: function(e) {
    const quickRemark = e.currentTarget.dataset.remark;
    console.log('选择快捷备注:', quickRemark);
    let currentRemarks = this.data.tempRemarks || '';
    
    // 检查是否已有相同内容
    if (currentRemarks.includes(quickRemark)) {
      wx.showToast({
        title: '已包含该备注',
        icon: 'none',
        duration: 800
      });
      return;
    }
    
    // 添加快捷备注，如果当前已有内容则添加逗号分隔
    if (currentRemarks) {
      currentRemarks += '，' + quickRemark;
    } else {
      currentRemarks = quickRemark;
    }
    
    // 确保不超过100字
    if (currentRemarks.length > 100) {
      currentRemarks = currentRemarks.substr(0, 100);
      wx.showToast({
        title: '备注最多100字',
        icon: 'none',
        duration: 800
      });
    }
    
    this.setData({
      tempRemarks: currentRemarks,
      remarksLength: currentRemarks.length
    });
    
    // 添加成功提示
    wx.showToast({
      title: '已添加备注',
      icon: 'none',
      duration: 800
    });
  },
  
  /**
   * 确认备注
   */
  confirmRemarks: function() {
    this.setData({
      remarks: this.data.tempRemarks,
      remarksLength: this.data.tempRemarks ? this.data.tempRemarks.length : 0,
      showRemarksPopup: false
    });
  },

  /**
   * 跳转到备注页面
   */
  navigateToRemarks: function() {
    // 使用弹出层替代页面跳转
    this.showRemarksPopup();
  },

  /**
   * 跳转到时间选择页面
   * 注意：此方法不再需要，但可以保留以防需要回退到页面跳转方式
   */
  selectDeliveryTime: function() {
    // 现在使用弹出层，此方法不再跳转
    this.showDeliveryTimePopup();
  },

  /**
   * 处理从购物车页面传递过来的结算数据
   */
  processCheckoutData: function(checkoutData) {
    console.log('开始处理结算数据');
    
    try {
      if (!checkoutData || !checkoutData.items || !Array.isArray(checkoutData.items) || checkoutData.items.length === 0) {
        console.log('结算数据无效或为空');
        this.showNoItemsToast();
        return;
      }
      
      const items = checkoutData.items;
      console.log('处理商品数据, 共', items.length, '个商品');
      
      // 格式化订单商品数据
      const orderItems = items.map(item => ({
        id: item._id || `temp_${Date.now()}`,
        productId: item.productId,
        name: item.name || '未知商品',
        image: item.image || '/assets/images/products/default.png',
        price: Number(item.price || 0),
        count: Number(item.quantity || 1),
        specs: item.spec || '标准规格'
      }));
      
      // 判断是否有有效商品
      if (orderItems.length === 0) {
        console.log('没有有效的商品数据');
        this.showNoItemsToast();
        return;
      }
      
      // 确保金额数据有效
      const goodsTotal = isNaN(parseFloat(checkoutData.totalPrice)) ? 0 : parseFloat(checkoutData.totalPrice);
      const deliveryFee = isNaN(parseFloat(checkoutData.deliveryFee)) ? 8 : parseFloat(checkoutData.deliveryFee);
      const discount = isNaN(parseFloat(checkoutData.discount)) ? 0 : parseFloat(checkoutData.discount);
      const finalPrice = isNaN(parseFloat(checkoutData.finalPrice)) ? 
                         (goodsTotal + deliveryFee - discount) : 
                         parseFloat(checkoutData.finalPrice);
      
      // 处理备注信息
      let remarks = '';
      
      // 尝试从orderRemarks存储中获取
      try {
        const storedRemarks = wx.getStorageSync('orderRemarks');
        if (storedRemarks) {
          remarks = storedRemarks;
          console.log('从orderRemarks获取备注:', remarks);
          wx.removeStorageSync('orderRemarks');
        }
      } catch (e) {
        console.error('获取orderRemarks失败:', e);
      }
      
      // 如果没有从缓存获取到，则使用checkoutData中的备注
      if (!remarks && checkoutData.remarks) {
        remarks = checkoutData.remarks;
        console.log('使用checkoutData中的备注:', remarks);
      }
      
      // 设置页面数据
      this.setData({
        orderItems: orderItems,
        cartData: {
          cartItems: items
        },
        orderAmount: {
          goodsTotal: goodsTotal.toFixed(2),
          delivery: deliveryFee.toFixed(2),
          discount: discount.toFixed(2),
          total: finalPrice.toFixed(2)
        },
        remarks: remarks,
        remarksLength: remarks.length,
        isLoading: false
      });
      
      console.log('结算页面数据设置完成:', this.data.orderItems);
      wx.hideLoading();
    } catch (error) {
      console.error('处理结算数据时出错:', error);
      this.showNoItemsToast();
    }
  },

  // 显示地址选择弹出层
  showAddressPopup() {
    this.setData({
      showAddressPopup: true,
      addressLoading: true,
      addressEmpty: false
    });
    
    // 延迟加载地址列表，避免页面卡顿
    setTimeout(() => {
      this.loadAddresses();
    }, 100);
  },

  // 关闭地址选择弹出层
  hideAddressPopup() {
    this.setData({
      showAddressPopup: false
    });
  },

  // 加载地址列表
  loadAddresses() {
    const app = getApp();
    
    // 处理未登录情况
    if (!app.globalData || !app.globalData.isLogin) {
      this.setData({
        addressLoading: false,
        addressEmpty: true,
        addressList: []
      });
      
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // 执行地址加载
    wx.cloud.callFunction({
      name: 'addressService',
      data: {
        action: 'getAddresses'
      }
    })
    .then(res => {
      console.log('获取地址成功:', res);
      if (res.result && res.result.code === 0) {
        const addressList = res.result.data || [];
        this.setData({
          addressList,
          addressLoading: false,
          addressEmpty: addressList.length === 0,
          selectedAddressId: this.data.address ? this.data.address.id : ''
        });
      } else {
        // 处理服务端返回的错误
        this.setData({
          addressLoading: false,
          addressEmpty: true,
          addressList: []
        });
      }
    })
    .catch(err => {
      console.error('获取地址列表失败', err);
      // 统一错误处理
      this.setData({
        addressLoading: false,
        addressEmpty: true,
        addressList: []
      });
    });
  },

  // 获取微信收货地址
  getWechatAddress() {
    // 显示加载提示
    wx.showLoading({
      title: '正在获取...',
    });
    
    wx.chooseAddress({
      success: (res) => {
        // 用户选择地址成功
        const address = {
          id: 'wx_' + Date.now(), // 生成一个临时ID
          name: res.userName,
          phone: res.telNumber,
          address: `${res.provinceName} ${res.cityName} ${res.countyName} ${res.detailInfo}`,
          province: res.provinceName,
          city: res.cityName,
          district: res.countyName,
          detail: res.detailInfo,
          isDefault: true
        };
        
        this.setData({
          address: address,
          showAddressPopup: false
        });
        
        wx.showToast({
          title: '地址获取成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('获取微信收货地址失败', err);
        const errMsg = err.errMsg || '';
        
        // 判断错误类型并给出不同提示
        if (errMsg.includes('deny') || errMsg.includes('authorize')) {
          wx.showModal({
            title: '地址权限',
            content: '需要您授权使用通讯地址，是否前往设置页面？',
            confirmText: '去设置',
            success(res) {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        } else if (errMsg.includes('requiredPrivateInfos')) {
          wx.showModal({
            title: '配置问题',
            content: '小程序缺少必要的地址权限配置，请联系管理员',
            showCancel: false
          });
        } else {
          wx.showToast({
            title: '获取地址失败',
            icon: 'none'
          });
        }
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 选择地址
  selectAddress(e) {
    const addressId = e.currentTarget.dataset.id;
    const address = this.data.addressList.find(item => item._id === addressId);
    
    if (address) {
      // 获取地址组成部分
      const provinceText = address.region ? address.region[0] : '';
      const cityText = address.region ? address.region[1] : '';
      const districtText = address.region ? address.region[2] : '';
      const detailText = address.detailAddress || address.detail || '';
      
      // 组合完整地址
      const fullAddressText = `${provinceText} ${cityText} ${districtText} ${detailText}`;
      
      this.setData({
        selectedAddressId: addressId,
        address: {
          id: address._id,
          name: address.name,
          phone: address.phone,
          // 重要：设置完整地址字符串
          address: fullAddressText,
          // 根据addressService返回的数据结构调整字段
          province: provinceText,
          city: cityText,
          district: districtText,
          detail: detailText,
          isDefault: address.isDefault
        },
        showAddressPopup: false
      });
    }
  },

  // 前往新增地址页面
  navigateToAddAddress() {
    wx.navigateTo({
      url: '/pages/address/address-edit'
    });
    this.hideAddressPopup();
  },

  // 前往地址管理页面
  navigateToAddressList() {
    wx.navigateTo({
      url: '/pages/address/address-list'
    });
    this.hideAddressPopup();
  },

  // 计算配送费
  calculateDeliveryFee() {
    // 实际项目中，可能需要根据地址和其他条件计算配送费
    // 这里简化处理，固定配送费为8元
    const deliveryFee = 8;
    this.setData({
      deliveryFee
    });
  },

  // 计算总价
  calculateTotalPrice() {
    const { productPrice, deliveryFee } = this.data;
    const totalPrice = productPrice + deliveryFee;
    this.setData({
      totalPrice
    });
  },
}) 