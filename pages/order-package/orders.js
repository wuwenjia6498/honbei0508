// pages/order-package/orders.js
const app = getApp();
const { orderApi, getProductImageUrl } = require('../../utils/cloudApi');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    tabList: ['全部', '待付款', '待发货', '待收货', '已完成'],
    currentTab: 0,
    orderList: [],
    isLoading: true,
    isEmpty: false,
    statusMap: {
      0: 'all',      // 全部
      1: 'pending',  // 待付款
      2: 'processing', // 制作中 (包括已付款和制作中)
      3: 'delivering', // 配送中
      4: 'completed'   // 已完成
    },
    statusTextMap: {
      'pending': '待付款',
      'paid': '已付款',
      'processing': '制作中',
      'delivering': '配送中',
      'completed': '已完成',
      'cancelled': '已取消'
    },
    navHeight: 0,
    statusBarHeight: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 获取状态栏高度
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight;
    const navHeight = statusBarHeight + 44;
    
    this.setData({
      statusBarHeight,
      navHeight
    });
    
    // 从url参数获取初始激活的标签页
    if (options.tab) {
      const tab = parseInt(options.tab);
      if (tab >= 0 && tab < this.data.tabList.length) {
        this.setData({
          currentTab: tab
        });
      }
    }
    
    // 检查是否有状态参数
    if (options.status) {
      // 根据状态参数设置当前选中的标签
      for(let i = 0; i < Object.keys(this.data.statusMap).length; i++) {
        if (this.data.statusMap[i] === options.status) {
          this.setData({ currentTab: i });
          break;
        }
      }
    }
    
    // 初始加载订单
    this.getOrderList();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 检查登录状态
    if (!app.globalData.isLogin) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.navigateTo({
            url: '/pages/login/login?from=orders'
          });
        }
      });
      return;
    }
    
    // 刷新订单列表
    this.getOrderList();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    // 可以添加分页加载更多订单的逻辑
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 切换标签
   */
  switchTab: function(e) {
    const index = e.currentTarget.dataset.index;
    if (this.data.currentTab === index) {
      return;
    }
    this.setData({
      currentTab: index,
      isLoading: true,
      orderList: [],
      isEmpty: false
    });
    
    // 模拟加载数据
    setTimeout(() => {
      const orderList = this.getOrdersByStatus(index);
      this.setData({
        orderList,
        isLoading: false,
        isEmpty: orderList.length === 0
      });
    }, 500);
  },

  /**
   * 获取订单列表
   */
  getOrderList: function() {
    if (!app.globalData.isLogin) return;
    
    const statusKey = this.data.statusMap[this.data.currentTab];
    this.setData({ isLoading: true });
    
    wx.showLoading({
      title: '加载中',
    });
    
    orderApi.getOrders(statusKey)
      .then(res => {
        console.log('获取订单列表成功', res);
        if (res && res.success && res.data) {
          const orders = res.data.orders || [];
          
          // 收集所有云存储图片路径
          const cloudFileIDs = [];
          const fileIDMap = {};
          
          // 格式化订单数据
          const formattedOrders = orders.map((order, orderIdx) => {
            // 获取订单商品的图片
            const products = order.products.map((product, productIdx) => {
              // 处理商品图片路径
              let imageUrl = product.image;
              
              // 检查图片路径是否为云存储路径
              if (imageUrl && imageUrl.startsWith('cloud://')) {
                cloudFileIDs.push(imageUrl);
                const uniqueKey = `${order._id}_${product.productId}`;
                fileIDMap[imageUrl] = uniqueKey;
                
                // 尝试从缓存获取图片链接
                const cacheKey = `product_image_${order._id}_${product.productId}`;
                const cachedImage = wx.getStorageSync(cacheKey);
                if (cachedImage) {
                  console.log(`使用缓存图片:`, product.productId, cachedImage);
                  imageUrl = cachedImage;
                }
              }
              
              // 使用辅助函数处理图片URL
              imageUrl = getProductImageUrl(imageUrl);
              
              return {
                id: product.productId,
                image: imageUrl,
                name: product.name,
                price: product.price.toFixed(2),
                count: product.quantity
              };
            });
            
            // 计算商品总数
            const totalCount = order.products.reduce((sum, product) => sum + product.quantity, 0);
            
            return {
              id: order._id,
              orderNumber: order.orderNumber,
              status: order.status,
              statusText: this.data.statusTextMap[order.status] || order.statusText,
              products: products,
              totalCount: totalCount,
              totalAmount: order.totalAmount.toFixed(2),
              createTime: this.formatDate(order.createTime)
            };
          });
          
          this.setData({
            orderList: formattedOrders,
            isEmpty: formattedOrders.length === 0
          }, () => {
            console.log('订单列表设置完成，总共', formattedOrders.length, '个订单');
          });
          
          // 如果有云存储图片，获取临时链接
          if (cloudFileIDs.length > 0) {
            wx.cloud.getTempFileURL({
              fileList: cloudFileIDs,
              success: res => {
                console.log('获取图片临时链接成功', res);
                if (res.fileList && res.fileList.length > 0) {
                  // 更新订单商品图片
                  const newOrderList = [...this.data.orderList];
                  
                  res.fileList.forEach(file => {
                    if (file.fileID && file.tempFileURL) {
                      const uniqueKey = fileIDMap[file.fileID];
                      if (uniqueKey) {
                        const [orderId, productId] = uniqueKey.split('_');
                        
                        // 更新图片URL
                        newOrderList.forEach(order => {
                          if (order.id === orderId) {
                            order.products.forEach(product => {
                              if (product.id === productId) {
                                product.image = file.tempFileURL;
                                // 缓存图片URL
                                const cacheKey = `product_image_${orderId}_${productId}`;
                                wx.setStorageSync(cacheKey, file.tempFileURL);
                              }
                            });
                          }
                        });
                      }
                    }
                  });
                  
                  this.setData({ orderList: newOrderList });
                }
              },
              fail: err => {
                console.error('获取图片临时链接失败', err);
              }
            });
          }
        } else {
          this.setData({
            isEmpty: true
          });
        }
      })
      .catch(err => {
        console.error('获取订单列表失败', err);
        this.setData({
          isEmpty: true
        });
      })
      .finally(() => {
        this.setData({ isLoading: false });
        wx.hideLoading();
      });
  },
  
  /**
   * 格式化日期
   */
  formatDate: function(date) {
    if (!date) return '';
    
    try {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (e) {
      console.error('日期格式化错误', e);
      return '';
    }
  },
  
  /**
   * 查看订单详情
   */
  viewOrderDetail: function(e) {
    const orderId = e.currentTarget.dataset.id;
    console.log('查看订单详情:', orderId);
    
    wx.navigateTo({
      url: `/pages/order-package/order-detail?id=${orderId}`
    });
  },
  
  /**
   * 跳转到订单详情页 - 用于WXML中的绑定
   */
  goToOrderDetail: function(e) {
    this.viewOrderDetail(e);
  },
  
  /**
   * 继续支付订单
   */
  goToPay: function(e) {
    const orderId = e.currentTarget.dataset.id;
    console.log('继续支付订单:', orderId);
    
    // 跳转到支付页面
    wx.navigateTo({
      url: `/pages/payment/payment?orderId=${orderId}`
    });
  },
  
  /**
   * 取消订单
   */
  cancelOrder: function(e) {
    const orderId = e.currentTarget.dataset.id;
    console.log('取消订单:', orderId);
    
    wx.showModal({
      title: '确认取消',
      content: '确定要取消该订单吗？',
      success: res => {
        if (res.confirm) {
          // 调用取消订单API
          wx.showLoading({
            title: '取消中',
          });
          
          orderApi.cancelOrder(orderId)
            .then(res => {
              console.log('取消订单成功', res);
              if (res && res.success) {
                wx.showToast({
                  title: '取消成功',
                  icon: 'success'
                });
                // 刷新订单列表
                this.getOrderList();
              } else {
                wx.showToast({
                  title: res.message || '取消失败',
                  icon: 'none'
                });
              }
            })
            .catch(err => {
              console.error('取消订单失败', err);
              wx.showToast({
                title: '取消失败，请重试',
                icon: 'none'
              });
            })
            .finally(() => {
              wx.hideLoading();
            });
        }
      }
    });
  },
  
  /**
   * 确认收货
   */
  confirmReceive: function(e) {
    const orderId = e.currentTarget.dataset.id;
    console.log('确认收货:', orderId);
    
    wx.showModal({
      title: '确认收货',
      content: '确认已收到商品吗？',
      success: res => {
        if (res.confirm) {
          // 调用确认收货API
          wx.showLoading({
            title: '处理中',
          });
          
          orderApi.confirmReceive(orderId)
            .then(res => {
              console.log('确认收货成功', res);
              if (res && res.success) {
                wx.showToast({
                  title: '确认成功',
                  icon: 'success'
                });
                // 刷新订单列表
                this.getOrderList();
              } else {
                wx.showToast({
                  title: res.message || '确认失败',
                  icon: 'none'
                });
              }
            })
            .catch(err => {
              console.error('确认收货失败', err);
              wx.showToast({
                title: '确认失败，请重试',
                icon: 'none'
              });
            })
            .finally(() => {
              wx.hideLoading();
            });
        }
      }
    });
  },
  
  /**
   * 重新购买
   */
  repurchase: function(e) {
    const orderId = e.currentTarget.dataset.id;
    console.log('重新购买:', orderId);
    
    // 跳转到商品详情页
    const orderItem = this.data.orderList.find(item => item.id === orderId);
    if (orderItem && orderItem.products && orderItem.products.length > 0) {
      const productId = orderItem.products[0].id;
      wx.navigateTo({
        url: `/pages/product/product?id=${productId}`
      });
    }
  },
  
  /**
   * 回到首页
   */
  goToHome: function() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 返回上一页
   */
  navigateBack: function() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  /**
   * 返回按钮点击事件
   */
  back: function() {
    this.navigateBack();
  }
})