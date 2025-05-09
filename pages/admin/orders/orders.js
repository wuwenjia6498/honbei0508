Page({
  /**
   * 页面的初始数据
   */
  data: {
    activeTab: 0,
    showListView: true,
    currentOrder: null,
    tabList: ['全部', '待发货', '配送中', '已完成', '已取消'],
    statusMap: {
      0: 'all',
      1: 'pending',
      2: 'shipping',
      3: 'completed',
      4: 'cancelled'
    },
    orders: [],
    filteredOrders: [],
    loading: true,
    searchValue: '',
    showActionSheet: false,
    actions: [
      { name: '标记为待发货', value: 'pending' },
      { name: '标记为配送中', value: 'shipping' },
      { name: '标记为已完成', value: 'completed' },
      { name: '标记为已取消', value: 'cancelled' }
    ],
    actionOrderId: '',
    pageSize: 10,
    currentPage: 1,
    hasMoreOrders: true,
    isDemoMode: false,
    targetOrderId: null,
    customBackRegistered: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 检查是否有参数指定要查看的订单详情
    if (options && options.id) {
      // 直接查看订单详情
      this.setData({
        targetOrderId: options.id
      });
    }

    // 初始化云环境
    try {
      wx.cloud.init({
        traceUser: true,
        env: wx.cloud.DYNAMIC_CURRENT_ENV
      });
    } catch (err) {
      console.error('云环境初始化失败', err);
    }

    wx.showLoading({
      title: '加载中',
      mask: true
    });
    
    // 检查是否需要部署云函数提示
    this.checkCloudFunctionAvailable().then(available => {
      if (!available) {
        wx.hideLoading();
        wx.showModal({
          title: '云函数未部署',
          content: '检测到云函数未正确部署，是否切换到演示模式？',
          confirmText: '切换',
          success: (res) => {
            if (res.confirm) {
              this.enterDemoMode();
            } else {
              wx.navigateBack();
            }
          }
        });
        return;
      }
      
      // 正常流程 - 检查管理员权限
      this.checkAdminAuth().then(() => {
        // 检查订单集合是否存在及是否有数据
        this.checkOrdersCollection().then(() => {
          // 加载订单数据
    this.loadOrders();
          wx.hideLoading();
        }).catch(err => {
          wx.hideLoading();
          console.error('订单集合检查失败', err);
          wx.showToast({
            title: '订单数据访问失败',
            icon: 'none',
            duration: 2000
          });
          this.setData({
            loading: false,
            filteredOrders: [] // 设置为空数组以显示暂无订单
          });
        });
      }).catch(err => {
        wx.hideLoading();
        console.error('权限检查失败', err);
        wx.showModal({
          title: '无访问权限',
          content: '您没有访问管理页面的权限',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      });
    });
  },

  /**
   * 检查云函数是否可用
   */
  checkCloudFunctionAvailable: function() {
    return new Promise((resolve) => {
      wx.cloud.callFunction({
        name: 'getOpenId'
      }).then(() => {
        resolve(true);
      }).catch((err) => {
        console.error('云函数调用失败', err);
        resolve(false);
      });
    });
  },
  
  /**
   * 进入演示模式
   */
  enterDemoMode: function() {
    wx.showToast({
      title: '已切换到演示模式',
      icon: 'none',
      duration: 2000
    });
    
    // 加载模拟订单数据
    const demoOrders = [
      {
        _id: 'demo_order_1' + Date.now(),
        orderNumber: 'ORDER20230501001',
        status: 'pending',
        statusText: '待发货',
        normalizedStatus: 'pending',
        createTime: new Date('2023-05-01 10:23:45'),
        createTimeFormat: '2023-05-01 10:23:45',
        products: [
          {
            id: 'product1',
            name: '法式牛角面包',
            price: 19.9,
            quantity: 2,
            spec: '原味·轻烘焙',
            image: '/static/images/empty-data.svg'
          }
        ],
        totalAmount: 39.8,
        address: {
          name: '张三',
          phone: '13800138000',
          detail: '北京市朝阳区某某街道1号'
        }
      },
      {
        _id: 'demo_order_2' + Date.now(),
        orderNumber: 'ORDER20230502002',
        status: 'shipping',
        statusText: '配送中',
        normalizedStatus: 'shipping',
        createTime: new Date('2023-05-02 14:35:12'),
        createTimeFormat: '2023-05-02 14:35:12',
        products: [
          {
            id: 'product2',
            name: '抹茶红豆蛋糕',
            price: 29.9,
            quantity: 1,
            spec: '标准甜度',
            image: '/static/images/empty-data.svg'
          }
        ],
        totalAmount: 29.9,
        address: {
          name: '李四',
          phone: '13900139000',
          detail: '上海市浦东新区某某路2号'
        }
      },
      {
        _id: 'demo_order_3' + Date.now(),
        orderNumber: 'ORDER20230503003',
        status: 'completed',
        statusText: '已完成',
        normalizedStatus: 'completed',
        createTime: new Date('2023-05-03 09:12:36'),
        createTimeFormat: '2023-05-03 09:12:36',
        products: [
          {
            id: 'product3',
            name: '经典提拉米苏',
            price: 39.9,
            quantity: 1,
            spec: '标准甜度',
            image: '/static/images/empty-data.svg'
          }
        ],
        totalAmount: 39.9,
        address: {
          name: '王五',
          phone: '13700137000',
          detail: '广州市天河区某某街3号'
        }
      }
    ];
    
    this.setData({
      orders: demoOrders,
      filteredOrders: demoOrders,
      loading: false,
      isDemoMode: true
    });
  },

  /**
   * 检查当前用户是否有管理员权限
   */
  checkAdminAuth: function() {
    return new Promise((resolve, reject) => {
      // 判断用户是否登录
      wx.cloud.callFunction({
        name: 'checkAdminAuth',
        data: {}
      }).then(res => {
        console.log('权限检查结果：', res);
        if (res.result && res.result.isAdmin) {
          // 有管理员权限，直接通过
          resolve(res.result);
        } else {
          // 没有管理员权限，开发环境下尝试将当前用户添加为管理员
          if (wx.getAccountInfoSync().miniProgram.envVersion === 'develop') {
            this.createAdminConfig().then(() => {
              resolve();
            }).catch(err => {
              reject(err);
            });
          } else {
            // 生产环境拒绝无权限的用户
            reject(new Error('用户不是管理员'));
          }
        }
      }).catch(err => {
        // 云函数可能不存在或调用失败
        console.error('调用checkAdminAuth云函数失败', err);
        
        // 开发环境下创建一个临时管理员
        if (wx.getAccountInfoSync().miniProgram.envVersion === 'develop') {
          this.createAdminConfig().then(() => {
            resolve();
          }).catch(err => {
            reject(err);
          });
        } else {
          reject(err);
        }
      });
    });
  },

  /**
   * 创建管理员配置
   * 提示：正式环境中应由授权管理员在后台添加，这里为了演示方便直接创建
   */
  createAdminConfig: function() {
    return new Promise((resolve, reject) => {
      // 获取当前用户OpenID
      wx.cloud.callFunction({
        name: 'getOpenId'
      }).then(res => {
        if (!res.result || !res.result.openid) {
          wx.showToast({
            title: '无法获取用户信息',
            icon: 'none'
          });
          reject(new Error('获取openid失败'));
          return;
        }
        
        const openid = res.result.openid;
        console.log('当前用户openid:', openid);
        
        // 检查config集合是否存在
        wx.cloud.database().collection('config').where({
          _id: 'adminConfig'
        }).get().then(configRes => {
          if (configRes.data && configRes.data.length > 0) {
            // 配置已存在，更新管理员列表
            if (configRes.data[0].adminOpenids && configRes.data[0].adminOpenids.includes(openid)) {
              resolve();
              return;
            }
            
            // 将当前用户添加为管理员（仅用于演示）
            wx.cloud.database().collection('config').doc('adminConfig').update({
              data: {
                adminOpenids: wx.cloud.database().command.push(openid)
              }
            }).then(() => {
              resolve();
            }).catch(err => {
              console.error('更新管理员配置失败', err);
              reject(err);
            });
          } else {
            // 配置不存在，创建配置
            wx.cloud.database().collection('config').add({
              data: {
                _id: 'adminConfig',
                adminOpenids: [openid],
                created: wx.cloud.database().serverDate()
              }
            }).then(() => {
              resolve();
            }).catch(err => {
              console.error('创建管理员配置失败', err);
              reject(err);
            });
          }
        }).catch(err => {
          console.error('查询管理员配置失败', err);
          
          // 直接尝试创建文档，而不是先创建集合
          // 注意：客户端SDK无法创建集合，但可以添加文档（如果集合不存在，会自动创建）
          wx.cloud.database().collection('config').add({
            data: {
              _id: 'adminConfig',
              adminOpenids: [openid],
              created: wx.cloud.database().serverDate()
            }
          }).then(() => {
            resolve();
          }).catch(createErr => {
            console.error('创建管理员配置失败', createErr);
            
            // 如果还是失败，尝试使用云函数初始化数据
            wx.cloud.callFunction({
              name: 'initData',
              data: {
                action: 'createAdminConfig',
                openid: openid
              }
            }).then(() => {
              resolve();
            }).catch(cloudErr => {
              console.error('通过云函数初始化失败', cloudErr);
              reject(cloudErr);
            });
          });
        });
      }).catch(err => {
        console.error('获取openid失败', err);
        reject(err);
      });
    });
  },

  /**
   * 检查订单集合是否存在并包含数据
   */
  checkOrdersCollection: function() {
    return new Promise((resolve, reject) => {
      console.log('检查订单集合状态...');
      
      // 改为通过云函数检查订单集合，避免客户端直接访问数据库的权限问题
      wx.cloud.callFunction({
        name: 'initData',
        data: {
          action: 'diagnoseDatabase'
        }
      })
      .then(res => {
        console.log('诊断数据库结果:', res.result);
        
        // 检查结果中是否有订单信息
        if (res.result && res.result.success) {
          const ordersCount = res.result.ordersInfo && res.result.ordersInfo.count ? res.result.ordersInfo.count : 0;
          console.log('订单总数：', ordersCount);
          
          // 如果订单数量为0，自动导入订单数据
          if (ordersCount === 0) {
            console.log('订单数量为0，准备导入测试订单数据');
            // 在UI加载完成后执行导入
            setTimeout(() => {
              this.executeImportRealOrders()
                .then(() => {
                  console.log('自动导入订单成功');
                })
                .catch(err => {
                  console.error('自动导入订单失败', err);
                });
            }, 1000);
          }
          
          // 即使没有订单数据也视为成功
          resolve(ordersCount);
        } else {
          console.error('诊断数据库失败:', res.result);
          
          // 检查是否是"db.getTables is not a function"错误
          const isGetTablesError = res.result && 
                                  res.result.error && 
                                  typeof res.result.error === 'string' && 
                                  res.result.error.includes('getTables is not a function');
          
          if (isGetTablesError) {
            console.log('检测到云函数API兼容性问题，直接尝试初始化订单数据');
            // 直接尝试初始化订单数据
            this.directlyImportOrders(resolve);
            return;
          }
          
          if (this.data.isDemoMode) {
            // 演示模式下不需要真实数据库
            resolve(0);
            return;
          }
          
          // 尝试通过云函数创建订单集合并导入测试数据
          this.directlyImportOrders(resolve);
        }
      })
      .catch(err => {
        console.error('调用诊断云函数失败:', err);
        
        if (this.data.isDemoMode) {
          // 演示模式下不需要真实数据库
          resolve(0);
          return;
        }
        
        // 直接尝试导入订单数据
        this.directlyImportOrders(resolve);
      });
    });
  },
  
  /**
   * 直接调用导入订单功能，简化重复代码
   */
  directlyImportOrders: function(resolveCallback) {
    console.log('尝试通过云函数创建订单集合并导入测试数据');
    
    wx.cloud.callFunction({
      name: 'initData',
      data: {
        action: 'initOrderCollection'
      }
    })
    .then(res => {
      console.log('导入测试订单结果:', res);
      if (res.result && res.result.success) {
        console.log('成功导入测试订单数据');
        
        // 轻微延迟后刷新订单列表
        setTimeout(() => {
          this.loadOrders();
        }, 500);
        
        if (typeof resolveCallback === 'function') {
          resolveCallback(res.result.orderIds ? res.result.orderIds.length : 0);
        }
      } else {
        console.warn('导入测试订单失败:', res.result);
        // 即使导入失败也继续，后续会在UI上提示用户
        if (typeof resolveCallback === 'function') {
          resolveCallback(0);
        }
      }
    })
    .catch(err => {
      console.error('调用云函数导入订单失败', err);
      
      // 检查是否是权限问题
      const errMsg = err.errMsg || JSON.stringify(err);
      const isPermissionError = errMsg.includes('permission') || errMsg.includes('Permission') || errMsg.includes('502003');
      
      if (isPermissionError) {
        wx.showModal({
          title: '数据库权限错误',
          content: '您需要在微信云开发控制台设置数据库权限。是否切换到演示模式？',
          confirmText: '演示模式',
          cancelText: '我知道了',
          success: (res) => {
            if (res.confirm) {
              this.enterDemoMode();
            }
          }
        });
      }
      
      // 即使失败也继续，可能是临时网络问题
      if (typeof resolveCallback === 'function') {
        resolveCallback(0);
      }
    });
  },

  /**
   * 加载订单数据
   */
  loadOrders: function (isLoadMore = false) {
    // 如果是演示模式，不进行实际加载
    if (this.data.isDemoMode) {
      // 根据当前tab过滤演示数据
      this.filterOrdersByTab(this.data.activeTab);
      return;
    }
    
    const { activeTab, statusMap, currentPage, pageSize, orders, searchValue } = this.data;
    
    if (isLoadMore) {
      this.setData({ loadingMore: true });
    } else {
      this.setData({ loading: true });
    }
    
    // 设置加载超时处理
    const loadingTimeout = setTimeout(() => {
      this.setData({
        loading: false,
        loadingMore: false
      });
      wx.showToast({
        title: '加载超时，请重试',
        icon: 'none'
      });
    }, 15000); // 15秒超时
    
    // 查询参数
    const queryParams = {
      page: isLoadMore ? currentPage : 1,
      pageSize: pageSize,
      sortField: 'createTime',
      sortOrder: 'desc'
    };
    
    // 根据标签页筛选
    if (activeTab > 0) {
      // 考虑到用户端可能有不同的状态值，这里做个兼容
      const status = statusMap[activeTab];
      if (status === 'pending') {
        // 待发货状态
        queryParams.status = 'pending';
        // 添加备选状态，以兼容多种可能的状态值
        queryParams.alternativeStatuses = ['paid', 'processing'];
      } else if (status === 'shipping') {
        // 配送中状态
        queryParams.status = 'shipping';
        queryParams.alternativeStatuses = ['delivering'];
      } else if (status === 'completed') {
        // 已完成状态
        queryParams.status = 'completed';
      } else if (status === 'cancelled') {
        // 已取消状态
        queryParams.status = 'cancelled';
      }
    }
    
    // 如果有搜索关键词
    if (searchValue) {
      queryParams.keyword = searchValue;
    }
    
    console.log('订单查询参数：', queryParams);
    
    // 直接调用云函数，不通过cloudApi
    wx.cloud.callFunction({
      name: 'orderService',
      data: {
        action: 'getAdminOrders',
        ...queryParams
      }
    }).then(res => {
      // 清除超时定时器
      clearTimeout(loadingTimeout);
      
      console.log('云函数调用结果:', res.result);
      
      if (res.result && res.result.success) {
        console.log('获取到的订单数据：', res.result.data);
        
        const { orders: newOrders, pagination } = res.result.data;
        
        // 处理订单数据
        const processedOrders = newOrders.map(order => {
          // 使用标准化的状态
          let statusText = order.statusText || '未知';
          let normalizedStatus = order.normalizedStatus || order.status;
          
          // 根据管理界面需要，再次标准化状态
          switch (normalizedStatus) {
            case 'pending':
            case 'paid':
            case 'processing':
              statusText = '待发货';
              normalizedStatus = 'pending';
              break;
            case 'shipping':
            case 'delivering':
              statusText = '配送中';
              normalizedStatus = 'shipping';
              break;
            case 'completed':
              statusText = '已完成';
              normalizedStatus = 'completed';
              break;
            case 'cancelled':
              statusText = '已取消';
              normalizedStatus = 'cancelled';
              break;
          }
          
          return {
            ...order,
            statusText,
            normalizedStatus,
            // 格式化创建时间
            createTimeFormat: this.formatDate(order.createTime)
          };
        });
        
        // 更新数据
        if (isLoadMore) {
          this.setData({
            orders: [...orders, ...processedOrders],
            filteredOrders: [...orders, ...processedOrders],
            currentPage: pagination.page + 1,
            hasMoreOrders: pagination.page < pagination.totalPages,
            loadingMore: false
          });
        } else {
          this.setData({
            orders: processedOrders,
            filteredOrders: processedOrders,
            currentPage: 2,
            hasMoreOrders: pagination.totalPages > 1,
            loading: false
          });
        }
        
        // 根据标签筛选
        this.directFilterOrders(activeTab);
      } else {
        console.error('获取订单失败', res.result);
        wx.showToast({
          title: (res.result && res.result.message) || '获取订单失败',
          icon: 'none'
        });
        this.setData({
          loading: false,
          loadingMore: false
        });
        
        // 尝试回退方案
        this.fallbackLoadOrders(isLoadMore);
      }
    }).catch(err => {
      // 清除超时定时器
      clearTimeout(loadingTimeout);
      
      console.error('调用获取订单云函数失败', err);
      
      // 如果API调用失败，回退到使用云数据库直接查询
      console.log('尝试使用云数据库直接查询订单');
      this.fallbackLoadOrders(isLoadMore);
    });
  },
  
  /**
   * 回退方案：直接使用云数据库查询订单
   */
  fallbackLoadOrders: function(isLoadMore = false) {
    console.log('执行回退查询方案...');
    
    const { activeTab, statusMap, currentPage, pageSize, orders, searchValue } = this.data;
    
    // 查询条件
    let query = {};
    const db = wx.cloud.database();
    const _ = db.command;
    
    // 根据标签页筛选
    if (activeTab > 0) {
      // 考虑到用户端可能有不同的状态值，这里做个兼容
      const status = statusMap[activeTab];
      if (status === 'pending') {
        // 处理中、待付款、已付款状态都显示在待发货选项卡
        query = {
          status: _.in(['pending', 'paid', 'processing'])
        };
      } else if (status === 'shipping') {
        // 配送中状态
        query = {
          status: _.in(['shipping', 'delivering'])
        };
      } else if (status === 'completed') {
        // 已完成状态
        query.status = 'completed';
      } else if (status === 'cancelled') {
        // 已取消状态
        query.status = 'cancelled';
      }
    }
    
    // 如果有搜索关键词
    if (searchValue) {
      // 支持搜索订单号、收货人姓名、手机号
      const orConditions = [
        { orderNumber: db.RegExp({
          regexp: searchValue,
          options: 'i',
        })},
        { 'address.name': db.RegExp({
          regexp: searchValue,
          options: 'i',
        })},
        { 'address.phone': db.RegExp({
          regexp: searchValue,
          options: 'i',
        })}
      ];
      
      if (Object.keys(query).length > 0) {
        // 已有查询条件，合并查询
        query = {
          ...query,
          $or: orConditions
        };
      } else {
        // 只有搜索条件
        query = {
          $or: orConditions
        };
      }
    }
    
    const page = isLoadMore ? currentPage : 1;
    
    console.log('回退方案订单查询条件：', query);
    console.log('分页信息：', { page, pageSize });
    
    // 也尝试调用云函数而不是直接查询数据库
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    
    // 尝试调用云函数方式查询
    wx.cloud.callFunction({
      name: 'orderService',
      data: {
        action: 'getAdminOrders',
        page: page,
        pageSize: pageSize,
        status: activeTab > 0 ? statusMap[activeTab] : 'all',
        keyword: searchValue || ''
      }
    }).then(res => {
      wx.hideLoading();
      console.log('云函数直接调用结果:', res);
      
      if (res.result && res.result.success) {
        const { orders: newOrders, pagination } = res.result.data;
        
        // 处理订单数据
        const processedOrders = newOrders.map(order => {
          // 使用标准化的状态
          let statusText = order.statusText || '未知';
          let normalizedStatus = order.normalizedStatus || order.status;
          
          // 根据管理界面需要，再次标准化状态
          switch (normalizedStatus) {
            case 'pending':
            case 'paid':
            case 'processing':
              statusText = '待发货';
              normalizedStatus = 'pending';
              break;
            case 'shipping':
            case 'delivering':
              statusText = '配送中';
              normalizedStatus = 'shipping';
              break;
            case 'completed':
              statusText = '已完成';
              normalizedStatus = 'completed';
              break;
            case 'cancelled':
              statusText = '已取消';
              normalizedStatus = 'cancelled';
              break;
          }
          
          return {
            ...order,
            statusText,
            normalizedStatus,
            // 格式化创建时间
            createTimeFormat: this.formatDate(order.createTime)
          };
        });
        
        // 更新数据
        if (isLoadMore) {
      this.setData({
            orders: [...orders, ...processedOrders],
            filteredOrders: [...orders, ...processedOrders],
            currentPage: pagination.page + 1,
            hasMoreOrders: pagination.page < pagination.totalPages,
            loadingMore: false
          });
        } else {
          this.setData({
            orders: processedOrders,
            filteredOrders: processedOrders,
            currentPage: 2,
            hasMoreOrders: pagination.totalPages > 1,
        loading: false
      });
        }
        
        // 根据标签筛选
        this.directFilterOrders(activeTab);
        return;
      }
      
      // 如果云函数调用失败，回退到直接查询数据库
      console.log('云函数调用失败，回退到直接查询数据库');
      this.fallbackDirectQuery(query, page, pageSize, isLoadMore);
      
    }).catch(err => {
      wx.hideLoading();
      console.error('调用订单云函数失败:', err);
      // 回退到直接查询数据库
      this.fallbackDirectQuery(query, page, pageSize, isLoadMore);
    });
  },
  
  /**
   * 二次回退：直接查询数据库
   */
  fallbackDirectQuery: function(query, page, pageSize, isLoadMore) {
    const { orders, activeTab } = this.data;
  
    // 从云数据库获取订单
    wx.cloud.database().collection('orders')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
      .then(res => {
        console.log('直接数据库查询获取到的订单数据：', res.data);
        
        const newOrders = res.data.map(order => {
          // 添加状态文本
          let statusText = '未知';
          let normalizedStatus = order.status;
          
          // 标准化状态，兼容不同格式
          switch (order.status) {
            case 'pending':
            case 'paid':
            case 'processing':
              statusText = '待发货';
              normalizedStatus = 'pending';
              break;
            case 'shipping':
            case 'delivering':
              statusText = '配送中';
              normalizedStatus = 'shipping';
              break;
            case 'completed':
              statusText = '已完成';
              normalizedStatus = 'completed';
              break;
            case 'cancelled':
              statusText = '已取消';
              normalizedStatus = 'cancelled';
              break;
            default:
              // 如果订单有自定义的statusText，优先使用
              statusText = order.statusText || '未知';
              break;
          }
          
          // 处理地址格式
          let address = order.address;
          if (address) {
            // 兼容不同格式的地址
            if (typeof address.detail === 'undefined' && address.fullAddress) {
              address.detail = address.fullAddress;
            }
          }
          
          return {
            ...order,
            statusText,
            normalizedStatus,
            address,
            // 格式化创建时间
            createTimeFormat: this.formatDate(order.createTime)
          };
        });
        
        // 更新数据
        if (isLoadMore) {
          this.setData({
            orders: [...orders, ...newOrders],
            filteredOrders: [...orders, ...newOrders],
            currentPage: page + 1,
            hasMoreOrders: newOrders.length === pageSize,
            loadingMore: false
          });
        } else {
          this.setData({
            orders: newOrders,
            filteredOrders: newOrders,
            currentPage: 2,
            hasMoreOrders: newOrders.length === pageSize,
            loading: false
          });
        }
        
        // 根据标签筛选
        this.directFilterOrders(activeTab);
      })
      .catch(err => {
        console.error('回退方案获取订单失败', err);
        wx.showToast({
          title: '获取订单失败',
          icon: 'none'
        });
        this.setData({
          loading: false,
          loadingMore: false
        });
      });
  },

  /**
   * 格式化日期
   */
  formatDate: function(date) {
    if (!date) return '';
    
    // 如果是字符串，转为Date对象
    if (typeof date === 'string') {
      date = new Date(date);
    } else if (date instanceof Object && date.toDate) {
      // 如果是Firestore时间戳，转为Date对象
      date = date.toDate();
    }
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  },

  /**
   * 切换标签页
   */
  switchTab: function (e) {
    const tabIndex = e.currentTarget.dataset.index;
    console.log('切换到标签:', tabIndex, this.data.tabList[tabIndex]);
    
    this.setData({
      activeTab: tabIndex,
      currentPage: 1, // 切换标签时重置页码
      hasMoreOrders: true
    });
    
    // 立即使用当前内存中的订单数据进行筛选
    this.directFilterOrders(tabIndex);
    
    // 然后重新加载订单（如果需要的话）
    // this.loadOrders();
  },

  /**
   * 直接筛选当前内存中的订单数据
   * 这个函数仅使用订单的显示文本(statusText)进行筛选
   */
  directFilterOrders: function(tabIndex) {
    const { orders, tabList } = this.data;
    let filteredOrders = [];
    
    console.log('开始直接筛选 - 共有订单:', orders.length, '当前标签:', tabList[tabIndex]);
    
    // 输出所有订单的ID和状态，便于调试
    orders.forEach((order, index) => {
      console.log(`订单${index+1} - ID:${order._id}, 显示状态:${order.statusText}, 系统状态:${order.status}`);
    });
    
    if (tabIndex === 0) {
      // 全部订单
      filteredOrders = orders;
    } else {
      // 通过状态文本筛选 - 这是最直接可靠的方式
      const targetStatusText = tabList[tabIndex]; // 直接使用标签文本作为状态文本
      console.log('目标状态文本:', targetStatusText);
      
      filteredOrders = orders.filter(order => {
        const match = order.statusText === targetStatusText;
        console.log(`订单${order._id} - 状态文本:"${order.statusText}", 匹配:"${targetStatusText}" = ${match}`);
        return match;
      });
    }
    
    console.log(`筛选后订单数: ${filteredOrders.length}/${orders.length}`);
    
    // 更新界面
    this.setData({
      filteredOrders: filteredOrders
    });
    
    return filteredOrders.length;
  },

  /**
   * 根据标签筛选订单
   * 这个函数将被保留用于兼容性，但实际使用directFilterOrders进行筛选
   */
  filterOrdersByTab: function (tabIndex) {
    return this.directFilterOrders(tabIndex);
  },
  
  /**
   * 根据标签索引获取对应的状态文本
   */
  getStatusTextByTabIndex: function(tabIndex) {
    switch(tabIndex) {
      case 1: return '待发货';
      case 2: return '配送中';
      case 3: return '已完成';
      case 4: return '已取消';
      default: return '';
    }
  },

  /**
   * 查看订单详情
   */
  viewOrderDetail: function (e) {
    const orderId = e.currentTarget.dataset.id;
    const orderDetail = this.data.filteredOrders.find(order => order._id === orderId);
    
    if (orderDetail) {
      this.setData({
        currentOrder: orderDetail,
        showListView: false
      });
      
      // 设置导航栏标题为"订单详情"
      wx.setNavigationBarTitle({
        title: '订单详情'
      });
    }
  },

  /**
   * 返回列表视图
   */
  backToList: function() {
    this.setData({
      showListView: true,
      currentOrder: null
    });
    
    // 恢复导航栏标题为"订单管理"
    wx.setNavigationBarTitle({
      title: '订单管理'
    });
  },

  /**
   * 复制文本
   */
  copyText: function (e) {
    const text = e.currentTarget.dataset.text;
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({
          title: '复制成功',
          icon: 'success',
          duration: 1500
        });
      }
    });
  },

  /**
   * 搜索订单
   */
  onSearch: function(e) {
    const value = e.detail.value;
    this.setData({
      searchValue: value,
      currentPage: 1,
      hasMoreOrders: true
    });
    
    // 执行搜索
    this.loadOrders();
  },

  /**
   * 清除搜索
   */
  clearSearch: function() {
    this.setData({
      searchValue: '',
      currentPage: 1,
      hasMoreOrders: true
    });
    
    // 重新加载订单
    this.loadOrders();
  },

  /**
   * 打开订单操作菜单
   */
  openActionSheet: function(e) {
    const orderId = e.currentTarget.dataset.id;
    this.setData({
      showActionSheet: true,
      actionOrderId: orderId
    });
  },
  
  /**
   * 关闭操作菜单
   */
  closeActionSheet: function() {
    this.setData({
      showActionSheet: false
    });
  },
  
  /**
   * 执行订单操作
   */
  handleAction: function(e) {
    const { actionOrderId } = this.data;
    const actionType = e.currentTarget.dataset.value;
    
    if (!actionOrderId || !actionType) {
      this.closeActionSheet();
      return;
    }
    
    // 更新订单状态确认
    wx.showModal({
      title: '确认修改',
      content: '确定要修改订单状态吗？',
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus(actionOrderId, actionType);
        }
        this.closeActionSheet();
      }
    });
  },

  /**
   * 更新订单状态
   */
  updateOrderStatus: function(orderId, status) {
    wx.showLoading({
      title: '正在更新',
      mask: true
    });
    
    // 演示模式下直接更新本地数据
    if (this.data.isDemoMode) {
      const statusTextMap = {
        'pending': '待发货',
        'shipping': '配送中',
        'completed': '已完成',
        'cancelled': '已取消'
      };
      
      // 更新本地订单数据
      const updatedOrders = this.data.orders.map(order => {
        if (order._id === orderId) {
          return {
            ...order,
            status: status,
            statusText: statusTextMap[status],
            normalizedStatus: status
          };
        }
        return order;
      });
      
      this.setData({
        orders: updatedOrders,
        filteredOrders: updatedOrders
      });
      
      // 如果当前在详情页，也更新详情页的数据
      if (!this.data.showListView && this.data.currentOrder && this.data.currentOrder._id === orderId) {
        let currentOrder = this.data.currentOrder;
        currentOrder.status = status;
        currentOrder.statusText = statusTextMap[status];
        currentOrder.normalizedStatus = status;
        
        this.setData({
          currentOrder: currentOrder
        });
      }
      
      wx.hideLoading();
      wx.showToast({
        title: '更新成功(演示)',
        icon: 'success'
      });
      
      // 根据当前tab过滤演示数据
      this.filterOrdersByTab(this.data.activeTab);
      return;
    }
    
    // 使用云函数更新订单状态
    wx.cloud.callFunction({
      name: 'orderStatusUpdate',
      data: {
        orderId: orderId,
        status: status
      }
    })
    .then(res => {
      wx.hideLoading();
      if (res.result && res.result.success) {
            wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
        
        // 刷新订单数据
        this.loadOrders();
        
        // 如果当前在详情页，也更新详情页的数据
        if (!this.data.showListView && this.data.currentOrder && this.data.currentOrder._id === orderId) {
          const statusTextMap = {
            'pending': '待发货',
            'shipping': '配送中',
            'completed': '已完成',
            'cancelled': '已取消'
          };
          
          let currentOrder = this.data.currentOrder;
          currentOrder.status = status;
          currentOrder.statusText = statusTextMap[status];
          
          this.setData({
            currentOrder: currentOrder
          });
        }
      } else {
        console.error('订单状态更新失败：', res);
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        });
      }
    })
    .catch(err => {
      wx.hideLoading();
      console.error('更新订单状态失败', err);
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
    });
  },

  /**
   * 联系客户
   */
  contactCustomer: function() {
    const { currentOrder } = this.data;
    if (currentOrder && currentOrder.address && currentOrder.address.phone) {
      wx.makePhoneCall({
        phoneNumber: currentOrder.address.phone,
        fail: function(err) {
          wx.showToast({
            title: '拨打电话失败',
            icon: 'none'
          });
        }
      });
    } else {
      wx.showToast({
        title: '无法获取客户电话',
        icon: 'none'
      });
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    if (this.data.showListView) {
      this.setData({
        currentPage: 1,
        hasMoreOrders: true
      });
      this.loadOrders();
      setTimeout(() => {
        wx.stopPullDownRefresh();
      }, 1000);
    } else {
      wx.stopPullDownRefresh();
    }
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    if (this.data.showListView && this.data.hasMoreOrders && !this.data.loadingMore) {
      this.loadOrders(true);
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '订单管理'
    };
  },

  /**
   * 显示管理选项菜单
   */
  onShowActionSheet: function() {
    const menuItems = ['刷新数据', '诊断连接问题', '设置管理员权限'];
    
    // 在演示模式下增加额外选项
    if (this.data.isDemoMode) {
      menuItems.push('云函数部署指南');
    }
    
    wx.showActionSheet({
      itemList: menuItems,
      success: (res) => {
        if (res.tapIndex === 0) {
          // 刷新数据
          wx.showLoading({
            title: '刷新中',
            mask: true
          });
          this.setData({
            currentPage: 1,
            hasMoreOrders: true
          });
          this.loadOrders();
          setTimeout(() => {
            wx.hideLoading();
          }, 1000);
        } else if (res.tapIndex === 1) {
          // 诊断连接问题
          this.enhancedDiagnose();
        } else if (res.tapIndex === 2) {
          // 设置当前用户为管理员
          this.setAsAdmin();
        } else if (res.tapIndex === 3 && this.data.isDemoMode) {
          // 显示云函数部署指南
          wx.showModal({
            title: '云函数部署指南',
            content: '请按以下步骤部署云函数:\n1. 在微信开发者工具中，点击"云开发"按钮\n2. 创建云开发环境(如已有则跳过)\n3. 在cloudfunctions目录上右键选择"上传并部署：云端安装依赖(所有文件)"\n4. 等待部署完成后重新进入页面',
            confirmText: '我知道了',
            showCancel: false
          });
        }
      }
    });
  },

  /**
   * 初始化订单数据
   */
  initOrderData: function() {
    wx.showModal({
      title: '初始化订单数据',
      content: '确定要初始化订单测试数据吗？这将清空现有订单并添加测试数据。',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '初始化中',
            mask: true
          });
          
          // 直接调用云函数初始化订单
          wx.cloud.callFunction({
            name: 'initData',
            data: {
              action: 'initOrderCollection'
            }
          })
          .then(res => {
            wx.hideLoading();
            console.log('初始化订单结果：', res);
            
            if (res.result && res.result.success) {
              wx.showToast({
                title: '订单初始化成功',
                icon: 'success',
                duration: 2000
              });
              
              // 延时刷新订单列表
              setTimeout(() => {
                this.setData({
                  currentPage: 1,
                  hasMoreOrders: true
                });
                this.loadOrders();
              }, 1000);
            } else {
              const errorMsg = res.result ? res.result.message : '未知错误';
              console.error('初始化订单失败：', errorMsg);
              
              wx.showModal({
                title: '初始化失败',
                content: errorMsg,
                showCancel: false
              });
            }
          })
          .catch(err => {
            wx.hideLoading();
            console.error('调用初始化订单云函数失败：', err);
            
            wx.showModal({
              title: '初始化失败',
              content: '云函数调用失败：' + (err.errMsg || JSON.stringify(err)),
              showCancel: false
            });
          });
        }
      }
    });
  },
  
  /**
   * 执行导入真实订单数据（不显示确认弹窗）
   */
  executeImportRealOrders: function() {
    return new Promise((resolve, reject) => {
      wx.showLoading({
        title: '导入中',
        mask: true
      });
      
      // 直接调用云函数初始化订单
      wx.cloud.callFunction({
        name: 'initData',
        data: {
          action: 'initOrderCollection'
        }
      })
      .then(res => {
        wx.hideLoading();
        console.log('导入订单结果：', res);
        
        if (res.result && res.result.success) {
          wx.showToast({
            title: '订单导入成功',
            icon: 'success',
            duration: 2000
          });
          
          // 延时刷新订单列表
          setTimeout(() => {
            this.setData({
              currentPage: 1,
              hasMoreOrders: true
            });
            this.loadOrders();
          }, 500);
          
          resolve(res.result);
        } else {
          const errorMsg = res.result ? res.result.message : '未知错误';
          console.error('订单导入失败：', errorMsg);
          
          wx.showModal({
            title: '导入失败',
            content: errorMsg,
            confirmText: '进入演示模式',
            cancelText: '重试',
            success: (modalRes) => {
              if (modalRes.confirm) {
                // 用户选择演示模式
                this.enterDemoMode();
                resolve({
                  success: true,
                  demo: true
                });
              } else {
                // 用户选择重试，检查云环境权限
                this.checkCloudDbPermissions().then(() => {
                  // 等待一秒再重试
                  setTimeout(() => {
                    this.enhancedDiagnose();
                  }, 1000);
                });
                reject(new Error(errorMsg));
              }
            }
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('调用导入订单云函数失败：', err);
        
        // 检查错误类型是否与数据库权限有关
        const errMsg = err.errMsg || JSON.stringify(err);
        const isPermissionError = errMsg.includes('permission') || errMsg.includes('Permission') || errMsg.includes('502003');
        
        if (isPermissionError) {
          wx.showModal({
            title: '云数据库权限错误',
            content: '您的微信小程序云数据库权限设置不足，无法直接操作数据库。请在微信云开发控制台中修改数据库权限或使用演示模式。',
            confirmText: '演示模式',
            cancelText: '了解详情',
            success: (modalRes) => {
              if (modalRes.confirm) {
                // 切换到演示模式
                this.enterDemoMode();
                resolve({
                  success: true,
                  demo: true
                });
              } else {
                // 显示权限设置说明
                wx.showModal({
                  title: '数据库权限设置指南',
                  content: '1. 进入微信开发者工具\n2. 点击"云开发"\n3. 选择"数据库"\n4. 点击"orders"集合\n5. 点击"权限设置"\n6. 选择"所有用户可读，仅创建者可读写"或\n7. 选择"自定义安全规则"并设置适当的权限',
                  confirmText: '我知道了',
                  showCancel: false
                });
                reject(err);
              }
            }
          });
        } else {
          // 其他类型错误
          wx.showModal({
            title: '导入失败',
            content: '云函数调用失败：' + errMsg,
            confirmText: '演示模式',
            cancelText: '我知道了',
            success: (modalRes) => {
              if (modalRes.confirm) {
                this.enterDemoMode();
                resolve({
                  success: true,
                  demo: true
                });
              } else {
                reject(err);
              }
            }
          });
        }
      });
    });
  },

  /**
   * 检查云数据库权限
   */
  checkCloudDbPermissions: function() {
    return new Promise((resolve) => {
      // 调用诊断函数检查云环境
      wx.cloud.callFunction({
        name: 'initData',
        data: {
          action: 'testDatabaseConnection'
        }
      }).then(res => {
        if (res.result && res.result.success) {
          resolve(true);
        } else {
          // 切换到演示模式
          wx.showModal({
            title: '数据库连接问题',
            content: '检测到云数据库连接问题，请检查您的云环境设置。是否切换到演示模式？',
            confirmText: '切换',
            cancelText: '取消',
            success: (modalRes) => {
              if (modalRes.confirm) {
                this.enterDemoMode();
              }
              resolve(false);
            }
          });
        }
      }).catch(err => {
        console.error('检查数据库权限失败:', err);
        
        // 弹窗提示错误
        wx.showModal({
          title: '云环境检测失败',
          content: '无法正确检测云环境，请检查您的配置和网络连接。是否切换到演示模式？',
          confirmText: '切换',
          cancelText: '取消',
          success: (modalRes) => {
            if (modalRes.confirm) {
              this.enterDemoMode();
            }
            resolve(false);
          }
        });
      });
    });
  },

  /**
   * 增强的诊断功能
   */
  enhancedDiagnose: function() {
    wx.showLoading({
      title: '正在诊断',
      mask: true
    });

    // 记录诊断信息
    const diagnosticInfo = {
      cloudEnv: {},
      cloudFunction: { status: 'pending' },
      database: { status: 'pending' },
      orders: { status: 'pending' },
      logs: []
    };

    const addLog = (message) => {
      console.log(message);
      diagnosticInfo.logs.push({
        time: new Date().toISOString(),
        message
      });
    };

    addLog('开始诊断流程');
    
    // 1. 检查云环境初始化
    try {
      const envInfo = wx.cloud.getCloudEnvList ? wx.cloud.getCloudEnvList() : '无法获取云环境';
      diagnosticInfo.cloudEnv = {
        status: 'success',
        info: envInfo
      };
      addLog('云环境检查完成');
    } catch (err) {
      diagnosticInfo.cloudEnv = {
        status: 'error',
        error: err.message || '未知错误'
      };
      addLog(`云环境检查失败: ${err.message}`);
    }

    // 初始化云环境（确保已正确初始化）
    try {
      addLog('尝试重新初始化云环境');
      wx.cloud.init({
        traceUser: true,
        env: wx.cloud.DYNAMIC_CURRENT_ENV
      });
      addLog('云环境初始化成功');
    } catch (err) {
      addLog(`云环境初始化失败: ${err.message}`);
    }

    // 2. 检查云函数
    addLog('开始检查云函数');
    wx.cloud.callFunction({
      name: 'getOpenId'
    }).then(openIdRes => {
      diagnosticInfo.cloudFunction = {
        status: 'success',
        openid: openIdRes.result && openIdRes.result.openid
      };
      addLog(`云函数调用成功，获取到openid: ${diagnosticInfo.cloudFunction.openid}`);
      
      // 3. 检查数据库连接
      addLog('开始检查数据库连接');
      return wx.cloud.database().collection('orders').count();
    }).then(countRes => {
      diagnosticInfo.database = {
        status: 'success',
        orderCount: countRes.total
      };
      addLog(`数据库连接成功，订单总数: ${countRes.total}`);
      
      // 4. 获取订单示例数据
      if (countRes.total > 0) {
        addLog('尝试获取订单示例数据');
        return wx.cloud.database().collection('orders')
          .limit(1)
          .get();
      } else {
        addLog('订单集合为空，无示例数据');
        throw new Error('订单集合为空');
      }
    }).then(sampleRes => {
      const orderExample = sampleRes.data && sampleRes.data.length > 0 ? sampleRes.data[0] : null;
      
      diagnosticInfo.orders = {
        status: 'success',
        example: orderExample,
        fields: orderExample ? Object.keys(orderExample) : []
      };
      
      // 检查订单数据结构
      if (orderExample) {
        addLog('获取到订单示例，正在检查数据结构');
        const requiredFields = ['status', 'products', 'address'];
        const missingFields = requiredFields.filter(field => !orderExample.hasOwnProperty(field));
        
        if (missingFields.length > 0) {
          diagnosticInfo.orders.missingFields = missingFields;
          addLog(`订单数据缺少以下字段: ${missingFields.join(', ')}`);
        } else {
          addLog('订单数据结构检查通过');
        }
      }
      
      // 显示诊断结果
      this.showDiagnosticResult(diagnosticInfo);
    }).catch(err => {
      // 处理云函数或数据库错误
      addLog(`诊断过程出错: ${err.message || JSON.stringify(err)}`);
      
      if (diagnosticInfo.cloudFunction.status === 'pending') {
        diagnosticInfo.cloudFunction = {
          status: 'error',
          error: err.message || JSON.stringify(err)
        };
      } else if (diagnosticInfo.database.status === 'pending') {
        diagnosticInfo.database = {
          status: 'error',
          error: err.message || JSON.stringify(err)
        };
      } else {
        diagnosticInfo.orders = {
          status: 'error',
          error: err.message || JSON.stringify(err)
        };
      }
      
      // 显示诊断结果
      this.showDiagnosticResult(diagnosticInfo);
    });
  },
  
  /**
   * 显示诊断结果
   */
  showDiagnosticResult: function(info) {
    wx.hideLoading();
    
    // 格式化诊断结果为可读文本
    let result = '诊断结果:\n\n';
    
    // 云环境信息
    result += `1. 云环境: ${info.cloudEnv.status === 'success' ? '✅ 正常' : '❌ 异常'}\n`;
    if (info.cloudEnv.status === 'error') {
      result += `   错误: ${info.cloudEnv.error}\n`;
    }
    
    // 云函数信息
    result += `\n2. 云函数: ${info.cloudFunction.status === 'success' ? '✅ 正常' : '❌ 异常'}\n`;
    if (info.cloudFunction.status === 'success') {
      result += `   OpenID: ${info.cloudFunction.openid}\n`;
    } else if (info.cloudFunction.status === 'error') {
      result += `   错误: ${info.cloudFunction.error}\n`;
    }
    
    // 数据库信息
    result += `\n3. 数据库: ${info.database.status === 'success' ? '✅ 正常' : '❌ 异常'}\n`;
    if (info.database.status === 'success') {
      result += `   订单总数: ${info.database.orderCount}\n`;
    } else if (info.database.status === 'error') {
      result += `   错误: ${info.database.error}\n`;
    }
    
    // 订单数据信息
    if (info.orders.status === 'success') {
      result += `\n4. 订单数据: ✅ 获取成功\n`;
      if (info.orders.fields && info.orders.fields.length > 0) {
        result += `   包含字段: ${info.orders.fields.join(', ')}\n`;
      }
      if (info.orders.missingFields && info.orders.missingFields.length > 0) {
        result += `   ⚠️ 缺少字段: ${info.orders.missingFields.join(', ')}\n`;
      }
    } else if (info.orders.status === 'error') {
      result += `\n4. 订单数据: ❌ 获取失败\n`;
      result += `   错误: ${info.orders.error}\n`;
    }
    
    // 添加建议措施
    result += '\n诊断建议:\n';
    if (info.cloudFunction.status === 'error') {
      result += '- 请确保云函数已正确部署\n- 在cloudfunctions目录上右键选择"上传并部署：云端安装依赖"\n';
    }
    if (info.database.status === 'error' || (info.database.status === 'success' && info.database.orderCount === 0)) {
      result += '- 数据库中没有订单数据，请点击"导入真实订单"按钮\n';
    }
    if (info.orders.status === 'error' || (info.orders.missingFields && info.orders.missingFields.length > 0)) {
      result += '- 订单数据结构可能有问题，尝试删除旧数据并重新导入\n';
    }
    
    wx.showModal({
      title: '系统诊断',
      content: result,
      showCancel: true,
      cancelText: '关闭',
      confirmText: '尝试修复',
      success: (res) => {
        if (res.confirm) {
          // 尝试修复问题
          this.tryFixProblems(info);
        }
      }
    });
    
    // 控制台输出详细信息
    console.log('=============== 诊断详情 ===============');
    console.log(info);
    console.log('=============== 诊断日志 ===============');
    info.logs.forEach(log => {
      console.log(`[${log.time}] ${log.message}`);
    });
  },
  
  /**
   * 尝试修复发现的问题
   */
  tryFixProblems: function(info) {
    wx.showLoading({
      title: '正在修复',
      mask: true
    });
    
    // 根据诊断结果尝试自动修复
    let fixActions = [];
    
    // 如果数据库中没有订单或订单数据结构有问题
    if (info.database.status === 'error' || 
        (info.database.status === 'success' && info.database.orderCount === 0) ||
        info.orders.status === 'error') {
      fixActions.push('importRealOrders');
    }
    
    // 如果没有可执行的修复操作
    if (fixActions.length === 0) {
      wx.hideLoading();
      wx.showModal({
        title: '修复提示',
        content: '没有可自动修复的问题，建议重新部署云函数并重启小程序。',
        showCancel: false
      });
      return;
    }
    
    // 执行修复操作
    Promise.all(fixActions.map(action => {
      if (action === 'importRealOrders') {
        // 直接导入真实订单数据
        return this.executeImportRealOrders();
      }
      return Promise.resolve();
    }))
    .then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '修复完成',
        icon: 'success'
      });
      // 重新加载订单数据
      setTimeout(() => {
        this.loadOrders();
      }, 1500);
    })
    .catch(err => {
      wx.hideLoading();
      wx.showModal({
        title: '修复失败',
        content: err.message || '未知错误',
        showCancel: false
      });
    });
  },
  
  /**
   * 设置当前用户为管理员
   */
  setAsAdmin: function() {
    wx.showModal({
      title: '设置管理员权限',
      content: '确定要将当前用户设置为管理员吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '设置中',
            mask: true
          });
          
          // 获取应用实例
          const app = getApp();
          
          // 检查 cloudApi 是否存在
          if (!app.globalData.cloudApi || !app.globalData.cloudApi.initApi) {
            console.error('cloudApi未初始化，使用云函数直接调用');
            
            // 直接调用云函数
            wx.cloud.callFunction({
              name: 'initData',
              data: {
                action: 'createAdminConfig'
              }
            }).then(res => {
              wx.hideLoading();
              if (res.result && res.result.success) {
                wx.showToast({
                  title: '已设置为管理员',
                  icon: 'success',
                  duration: 2000
                });
              } else {
                console.error('设置管理员失败:', res);
                wx.showToast({
                  title: '设置失败',
                  icon: 'none'
                });
              }
            }).catch(err => {
              wx.hideLoading();
              console.error('调用设置管理员云函数失败:', err);
              wx.showToast({
                title: '设置失败',
                icon: 'none'
              });
            });
            return;
          }
          
          // 使用云API设置管理员权限
          const { cloudApi } = app.globalData;
          
          cloudApi.initApi.setAsAdmin()
            .then(res => {
              wx.hideLoading();
              if (res && res.success) {
                wx.showToast({
                  title: '已设置为管理员',
                  icon: 'success',
                  duration: 2000
                });
              } else {
                console.error('设置管理员失败:', res);
                wx.showToast({
                  title: '设置失败',
                  icon: 'none'
                });
              }
            })
            .catch(err => {
              wx.hideLoading();
              console.error('调用设置管理员API失败:', err);
              wx.showToast({
                title: '设置失败',
                icon: 'none'
              });
            });
        }
      }
    });
  },

  /**
   * 导出订单数据为CSV格式
   */
  exportOrders: function() {
    // 显示加载提示
    wx.showLoading({
      title: '准备导出数据',
      mask: true
    });

    // 如果是演示模式，直接使用本地数据
    const orders = this.data.filteredOrders || [];
    
    if (orders.length === 0) {
      wx.hideLoading();
      wx.showToast({
        title: '没有可导出的订单',
        icon: 'none'
      });
      return;
    }

    try {
      // 生成CSV表头
      let csvContent = 'orderNumber,createTime,status,customerName,customerPhone,address,products,totalAmount\n';
      
      // 将订单数据转换为CSV行
      orders.forEach(order => {
        // 构建CSV行
        const products = order.products.map(p => 
          `${p.name}x${p.quantity}(¥${p.price})`
        ).join('|');
        
        const customerName = order.address?.name || '未知';
        const customerPhone = order.address?.phone || '未知';
        const address = order.address?.fullAddress || order.address?.detail || '未知';
        
        // 转义CSV中的引号和逗号
        const escapeCsv = (str) => {
          if (!str) return '';
          const escaped = String(str).replace(/"/g, '""');
          return `"${escaped}"`;
        };
        
        const row = [
          escapeCsv(order.orderNumber || order._id),
          escapeCsv(order.createTimeFormat || order.createTime),
          escapeCsv(order.statusText),
          escapeCsv(customerName),
          escapeCsv(customerPhone),
          escapeCsv(address),
          escapeCsv(products),
          order.totalAmount
        ].join(',');
        
        csvContent += row + '\n';
      });
      
      // 在手机环境中，提示用户复制数据
      wx.hideLoading();
      wx.showModal({
        title: '导出成功',
        content: '由于微信小程序的限制，无法直接下载文件。您可以复制数据后粘贴到电脑中的Excel或记事本中。',
        confirmText: '复制数据',
        success: (res) => {
          if (res.confirm) {
            wx.setClipboardData({
              data: csvContent,
              success: () => {
                wx.showToast({
                  title: '数据已复制',
                  icon: 'success'
                });
              }
            });
          }
        }
      });
      
      // 记录导出日志
      console.log('订单数据导出成功, 共导出 ' + orders.length + ' 条记录');
    } catch (error) {
      wx.hideLoading();
      console.error('导出订单数据失败:', error);
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      });
    }
  },

  /**
   * 清空所有订单数据
   */
  clearAllOrders: function() {
    wx.showModal({
      title: '清空所有订单',
      content: '确定要清空所有订单数据吗？此操作不可恢复！',
      confirmText: '确定清空',
      confirmColor: '#ff0000',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '正在清空',
            mask: true
          });
          
          // 调用专门的云函数清空订单
          wx.cloud.callFunction({
            name: 'cleanOrders',
            data: {}
          })
          .then(res => {
            wx.hideLoading();
            console.log('清空订单结果：', res);
            
            if (res.result && res.result.success) {
              wx.showToast({
                title: '订单已清空',
                icon: 'success',
                duration: 2000
              });
              
              // 延时刷新订单列表
              setTimeout(() => {
                this.setData({
                  currentPage: 1,
                  hasMoreOrders: true,
                  orders: [],
                  filteredOrders: []
                });
                this.loadOrders();
              }, 1000);
            } else {
              const errorMsg = res.result ? res.result.message : '未知错误';
              console.error('清空订单失败：', errorMsg);
              
              wx.showModal({
                title: '清空失败',
                content: '清空订单失败：' + errorMsg,
                showCancel: false
              });
            }
          })
          .catch(err => {
            wx.hideLoading();
            console.error('调用清空订单云函数失败：', err);
            
            // 尝试使用备用方法
            this.fallbackCleanOrders();
          });
        }
      }
    });
  },
  
  /**
   * 备用清空订单方法 - 当专用云函数失败时使用
   */
  fallbackCleanOrders: function() {
    console.log('使用备用方法清空订单...');
    
    wx.showLoading({
      title: '正在清空',
      mask: true
    });
    
    // 使用initData云函数的清空功能
    wx.cloud.callFunction({
      name: 'initData',
      data: {
        action: 'clearAll'
      }
    })
    .then(res => {
      wx.hideLoading();
      console.log('备用清空订单结果：', res);
      
      if (res.result && res.result.success) {
        wx.showToast({
          title: '订单已清空',
          icon: 'success'
        });
        
        // 刷新订单列表
        this.setData({
          currentPage: 1,
          hasMoreOrders: true,
          orders: [],
          filteredOrders: []
        });
        this.loadOrders();
      } else {
        const errorMsg = res.result ? res.result.message : '未知错误';
        wx.showModal({
          title: '清空失败',
          content: '备用方法清空订单失败：' + errorMsg,
          showCancel: false
        });
      }
    })
    .catch(err => {
      wx.hideLoading();
      console.error('备用方法清空订单失败：', err);
      
      wx.showModal({
        title: '清空失败',
        content: '所有清空方法都失败，请联系管理员手动清空订单',
        showCancel: false
      });
    });
  },

  /**
   * 初始化测试订单数据
   */
  initTestOrders: function() {
    wx.showModal({
      title: '初始化测试订单',
      content: '确定要添加测试订单数据吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '正在初始化',
            mask: true
          });
          
          // 直接调用云函数初始化订单
          wx.cloud.callFunction({
            name: 'initData',
            data: {
              action: 'initOrderCollection'
            }
          })
          .then(res => {
            wx.hideLoading();
            console.log('初始化订单结果：', res);
            
            if (res.result && res.result.success) {
              wx.showToast({
                title: '订单初始化成功',
                icon: 'success',
                duration: 2000
              });
              
              // 延时刷新订单列表
              setTimeout(() => {
                this.setData({
                  currentPage: 1,
                  hasMoreOrders: true
                });
                this.loadOrders();
              }, 1000);
            } else {
              const errorMsg = res.result ? res.result.message : '未知错误';
              console.error('初始化订单失败：', errorMsg);
              
              wx.showModal({
                title: '初始化失败',
                content: errorMsg,
                showCancel: false
              });
            }
          })
          .catch(err => {
            wx.hideLoading();
            console.error('调用初始化订单云函数失败：', err);
            
            wx.showModal({
              title: '初始化失败',
              content: '云函数调用失败：' + (err.errMsg || JSON.stringify(err)),
              showCancel: false
            });
          });
        }
      }
    });
  },
  
  /**
   * 导入真实订单数据
   */
  importRealOrders: function() {
    this.initOrderData();
  },

  /**
   * 处理微信小程序导航栏的返回按钮事件
   */
  onNavigateBack: function() {
    if (!this.data.showListView) {
      // 如果当前在详情页，返回到列表页
      this.backToList();
      return true; // 阻止默认返回行为
    }
    return false; // 使用默认返回行为
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
    // 设置自定义返回处理
    const page = this;
    wx.onAppRoute(function() {
      const pages = getCurrentPages();
      if (pages.length) {
        const currentPage = pages[pages.length - 1];
        if (currentPage.route === 'pages/admin/orders/orders' && !page.data.customBackRegistered) {
          page.data.customBackRegistered = true;
          wx.setNavigationBarColor({
            frontColor: '#ffffff',
            backgroundColor: '#a68a7b'
          });
          
          // 设置自定义返回事件
          wx.onBackPress && wx.onBackPress(function() {
            return page.onNavigateBack();
          });
        }
      }
    });
    
    // 如果有目标订单ID，加载该订单详情
    if (this.data.targetOrderId && this.data.orders.length > 0) {
      const order = this.data.orders.find(item => item._id === this.data.targetOrderId);
      if (order) {
        this.viewOrderDetail({
          currentTarget: {
            dataset: {
              id: this.data.targetOrderId
            }
          }
        });
        this.setData({
          targetOrderId: null
        });
      }
    }
  }
}) 