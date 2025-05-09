const app = getApp();
const { orderApi, getProductImageUrl } = require('../../../utils/cloudApi');

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
   * 页面显示时刷新订单
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
            console.log('发现云存储图片', cloudFileIDs.length, '个，开始获取临时链接');
            this.getCloudFileTempUrls(cloudFileIDs, fileIDMap);
          }
        } else {
          this.setData({
            orderList: [],
            isEmpty: true
          });
        }
      })
      .catch(err => {
        console.error('获取订单列表失败', err);
        this.setData({
          orderList: [],
          isEmpty: true
        });
      })
      .finally(() => {
        this.setData({ isLoading: false });
        wx.hideLoading();
      });
  },

  /**
   * 获取云存储图片临时链接
   */
  getCloudFileTempUrls: function(fileIDs, fileIDMap) {
    if (!fileIDs || fileIDs.length === 0) return;
    
    wx.cloud.getTempFileURL({
      fileList: fileIDs,
      success: res => {
        console.log('获取云存储图片临时链接成功', res);
        if (res.fileList && res.fileList.length > 0) {
          // 临时链接映射
          const tempUrlMap = {};
          res.fileList.forEach(file => {
            if (file.tempFileURL && fileIDMap[file.fileID]) {
              const uniqueKey = fileIDMap[file.fileID];
              tempUrlMap[uniqueKey] = file.tempFileURL;
              
              // 缓存图片URL，使用订单ID和商品ID作为缓存键
              const [orderId, productId] = uniqueKey.split('_');
              const cacheKey = `product_image_${orderId}_${productId}`;
              wx.setStorageSync(cacheKey, file.tempFileURL);
              
              console.log(`缓存图片URL:`, cacheKey, file.tempFileURL);
            }
          });
          
          // 更新订单列表中的商品图片
          const updatedOrderList = this.data.orderList.map(order => {
            const updatedProducts = order.products.map(product => {
              const uniqueKey = `${order.id}_${product.id}`;
              if (tempUrlMap[uniqueKey]) {
                return {
                  ...product,
                  image: tempUrlMap[uniqueKey]
                };
              }
              return product;
            });
            
            return {
              ...order,
              products: updatedProducts
            };
          });
          
          this.setData({
            orderList: updatedOrderList
          });
        }
      },
      fail: err => {
        console.error('获取云存储图片临时链接失败', err);
      }
    });
  },

  /**
   * 格式化日期
   */
  formatDate: function(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  },

  /**
   * 跳转到订单详情
   */
  goToOrderDetail: function(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/order-package/order-detail/order-detail?id=${orderId}`,
    });
  },

  /**
   * 取消订单
   */
  cancelOrder: function(e) {
    const orderId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '提示',
      content: '确定要取消此订单吗？',
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus(orderId, 'cancelled');
        }
      }
    });
  },

  /**
   * 提醒发货
   */
  remindDelivery: function(e) {
    const orderId = e.currentTarget.dataset.id;
    
    wx.showToast({
      title: '已提醒商家发货',
      icon: 'success'
    });
  },

  /**
   * 确认收货
   */
  confirmReceived: function(e) {
    const orderId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '提示',
      content: '确认已收到商品吗？',
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus(orderId, 'completed');
        }
      }
    });
  },

  /**
   * 去支付
   */
  goToPay: function(e) {
    const orderId = e.currentTarget.dataset.id;
    
    // 模拟支付流程，实际项目中应调用真实支付接口
    wx.showLoading({
      title: '支付处理中',
    });
    
    setTimeout(() => {
      wx.hideLoading();
      wx.showModal({
        title: '提示',
        content: '支付成功，是否查看订单详情？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: `/pages/order-package/order-detail/order-detail?id=${orderId}`,
            });
          } else {
            this.getOrderList(); // 刷新列表
          }
        }
      });
    }, 1500);
  },

  /**
   * 删除订单
   */
  deleteOrder: function(e) {
    const orderId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '提示',
      content: '确定要删除此订单吗？此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          orderApi.deleteOrder(orderId)
            .then(res => {
              if (res && res.success) {
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                });
                // 从列表中移除已删除的订单
                const updatedList = this.data.orderList.filter(order => order.id !== orderId);
                this.setData({
                  orderList: updatedList,
                  isEmpty: updatedList.length === 0
                });
              } else {
                wx.showToast({
                  title: '删除失败',
                  icon: 'none'
                });
              }
            })
            .catch(err => {
              console.error('删除订单失败', err);
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              });
            });
        }
      }
    });
  },

  /**
   * 更新订单状态
   */
  updateOrderStatus: function(orderId, status) {
    orderApi.updateOrderStatus(orderId, status)
      .then(res => {
        if (res && res.success) {
          wx.showToast({
            title: '操作成功',
            icon: 'success'
          });
          // 刷新订单列表
          this.getOrderList();
        } else {
          wx.showToast({
            title: '操作失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        console.error('更新订单状态失败', err);
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        });
      });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh: function() {
    this.getOrderList();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  /**
   * 返回上一页
   */
  back: function() {
    wx.navigateBack({
      delta: 1
    });
  }
}); 