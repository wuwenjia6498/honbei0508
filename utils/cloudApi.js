// 云函数API封装

/**
 * 调用云函数的通用方法
 * @param {string} name - 云函数名称
 * @param {object} data - 传递给云函数的数据
 * @returns {Promise} 返回云函数调用结果的Promise
 */
const callCloudFunction = async (name, data = {}) => {
  try {
    const result = await wx.cloud.callFunction({
      name,
      data
    });
    return result.result;
  } catch (error) {
    console.error(`调用云函数 ${name} 失败:`, error);
    throw error;
  }
};

// 产品相关API
const productApi = {
  /**
   * 获取商品列表
   * @param {object} params - 查询参数
   * @returns {Promise} 返回商品列表的Promise
   */
  getProducts: (params = {}) => {
    return callCloudFunction('getproducts', params);
  },

  /**
   * 获取商品详情
   * @param {string} productId - 商品ID
   * @returns {Promise} 返回商品详情的Promise
   */
  getProductDetail: (productId) => {
    return callCloudFunction('getproducts', { productId });
  }
};

// 分类相关API
const categoryApi = {
  /**
   * 获取分类列表
   * @param {boolean} onlyActive - 是否只获取启用的分类
   * @returns {Promise} 返回分类列表的Promise
   */
  getCategories: (onlyActive = true) => {
    return callCloudFunction('getCategories', { onlyActive });
  },

  /**
   * 获取分类详情
   * @param {string} categoryId - 分类ID
   * @returns {Promise} 返回分类详情的Promise
   */
  getCategoryDetail: (categoryId) => {
    return callCloudFunction('getCategories', { categoryId });
  }
};

// 购物车相关API
const cartApi = {
  /**
   * 获取购物车
   * @returns {Promise} 返回购物车数据的Promise
   */
  getCart: () => {
    return callCloudFunction('cartService', { action: 'getCart' });
  },

  /**
   * 添加商品到购物车
   * @param {string} productId - 商品ID
   * @param {number} quantity - 数量
   * @returns {Promise} 返回更新后的购物车数据的Promise
   */
  addToCart: (productId, quantity = 1) => {
    return callCloudFunction('cartService', {
      action: 'addToCart',
      productId,
      quantity
    });
  },

  /**
   * 更新购物车商品数量
   * @param {string} cartItemId - 购物车项ID
   * @param {number} quantity - 新数量
   * @returns {Promise} 返回更新后的购物车数据的Promise
   */
  updateCartItem: (cartItemId, quantity) => {
    return callCloudFunction('cartService', {
      action: 'updateCartItem',
      cartItemId,
      quantity
    });
  },

  /**
   * 移除购物车商品
   * @param {string} cartItemId - 购物车项ID
   * @returns {Promise} 返回更新后的购物车数据的Promise
   */
  removeCartItem: (cartItemId) => {
    return callCloudFunction('cartService', {
      action: 'removeCartItem',
      cartItemId
    });
  },

  /**
   * 清空购物车
   * @returns {Promise} 返回清空后的购物车数据的Promise
   */
  clearCart: () => {
    return callCloudFunction('cartService', { action: 'clearCart' });
  }
};

// 订单相关API
const orderApi = {
  /**
   * 创建订单
   * @param {array} products - 商品数组 [{ productId, quantity }]
   * @param {object} address - 地址信息
   * @param {boolean} clearCart - 是否清空购物车
   * @param {object} options - 其他选项（备注、配送时间等）
   * @returns {Promise} 返回创建的订单的Promise
   */
  createOrder: (products, address, clearCart = false, options = {}) => {
    return callCloudFunction('orderService', {
      action: 'createOrder',
      products,
      address,
      clearCart,
      remarks: options.remarks || '',
      deliveryTime: options.deliveryTime || { display: '尽快送达' },
      paymentMethod: options.paymentMethod || 'wechat'
    });
  },

  /**
   * 获取订单列表
   * @param {string} orderStatus - 订单状态，不传则获取所有订单
   * @returns {Promise} 返回订单列表的Promise
   */
  getOrders: (orderStatus = 'all') => {
    return callCloudFunction('orderService', {
      action: 'getOrders',
      orderStatus
    });
  },

  /**
   * 获取订单详情
   * @param {string} orderId - 订单ID
   * @returns {Promise} 返回订单详情的Promise
   */
  getOrderDetail: (orderId) => {
    return callCloudFunction('orderService', {
      action: 'getOrderDetail',
      orderId
    });
  },

  /**
   * 更新订单状态
   * @param {string} orderId - 订单ID
   * @param {string} orderStatus - 新的订单状态
   * @returns {Promise} 返回更新后的订单的Promise
   */
  updateOrderStatus: (orderId, orderStatus) => {
    // 直接使用新的云函数orderStatusUpdate
    return callCloudFunction('orderStatusUpdate', {
      orderId,
      status: orderStatus
    });
  },

  /**
   * 取消订单
   * @param {string} orderId - 订单ID
   * @returns {Promise} 返回取消后的订单的Promise
   */
  cancelOrder: (orderId) => {
    return callCloudFunction('orderService', {
      action: 'cancelOrder',
      orderId
    });
  },
  
  /**
   * 管理员获取订单列表（带高级筛选）
   * @param {object} params - 查询参数
   * @param {number} params.page - 页码，从1开始
   * @param {number} params.pageSize - 每页数量
   * @param {string} params.status - 订单状态，不传则获取所有状态
   * @param {object} params.dateRange - 日期范围，包含start和end
   * @param {string} params.keyword - 搜索关键词（订单号、客户名称、手机号）
   * @param {string} params.sortField - 排序字段，默认createTime
   * @param {string} params.sortOrder - 排序方向，desc或asc
   * @returns {Promise} 返回订单列表的Promise
   */
  getAdminOrders: (params = {}) => {
    // 确保action参数正确传递
    console.log('调用 cloudApi.orderApi.getAdminOrders，参数:', params);
    
    // 构造完整的请求参数对象
    const requestParams = {
      action: 'getAdminOrders',
      ...params
    };
    
    console.log('最终请求参数:', requestParams);
    
    return callCloudFunction('orderService', requestParams);
  }
};

// 用户相关API
const userApi = {
  /**
   * 用户登录
   * @param {object} userData - 用户数据
   * @returns {Promise} 返回用户信息的Promise
   */
  login: (userData = {}) => {
    return callCloudFunction('userService', {
      action: 'login',
      userData
    });
  },

  /**
   * 获取用户信息
   * @returns {Promise} 返回用户信息的Promise
   */
  getUserInfo: () => {
    return callCloudFunction('userService', { action: 'getUserInfo' });
  },

  /**
   * 更新用户信息
   * @param {object} userData - 用户数据
   * @returns {Promise} 返回更新后的用户信息的Promise
   */
  updateUserInfo: (userData) => {
    return callCloudFunction('userService', {
      action: 'updateUserInfo',
      userData
    });
  },

  /**
   * 检查用户是否是管理员
   * @returns {Promise} 返回是否是管理员的Promise
   */
  isAdmin: () => {
    return callCloudFunction('userService', { action: 'isAdmin' });
  }
};

// 初始化数据API (仅用于开发测试)
const initApi = {
  /**
   * 初始化所有数据
   * @returns {Promise} 返回初始化结果的Promise
   */
  initAllData: () => {
    return callCloudFunction('initData', { action: 'initAll' });
  },

  /**
   * 清空所有数据
   * @returns {Promise} 返回清空结果的Promise
   */
  clearAllData: () => {
    return callCloudFunction('initData', { action: 'clearAll' });
  },

  /**
   * 初始化特定集合数据
   * @param {string} collection - 集合名称 (products, categories, users)
   * @returns {Promise} 返回初始化结果的Promise
   */
  initCollection: (collection) => {
    return callCloudFunction('initData', { 
      action: 'init',
      collection
    });
  },
  
  /**
   * 初始化订单测试数据
   * @returns {Promise} 返回初始化订单结果的Promise
   */
  initOrderData: () => {
    return callCloudFunction('initData', {
      action: 'initOrderCollection'
    });
  },
  
  /**
   * 诊断数据库状态
   * @returns {Promise} 返回数据库诊断结果的Promise
   */
  diagnoseDatabse: () => {
    return callCloudFunction('initData', {
      action: 'diagnoseDatabase'
    });
  },
  
  /**
   * 设置当前用户为管理员
   * @returns {Promise} 返回设置结果的Promise
   */
  setAsAdmin: () => {
    return callCloudFunction('initData', {
      action: 'createAdminConfig'
    });
  }
};

/**
 * 处理商品图片加载失败的情况
 * @param {String} imageUrl - 原始图片URL
 * @return {String} - 处理后的图片URL或默认图片URL
 */
const getProductImageUrl = (imageUrl) => {
  // 默认图片路径
  const defaultImage = '/assets/images/products/product-brownie.jpg';
  
  // 如果图片路径为空，返回默认图片
  if (!imageUrl) {
    console.log('图片路径为空，使用默认图片');
    return defaultImage;
  }
  
  // 处理云存储图片
  if (imageUrl.startsWith('cloud://')) {
    // 尝试从缓存中获取临时链接
    const cacheKey = `product_image_${imageUrl.split('/').pop()}`;
    const cachedUrl = wx.getStorageSync(cacheKey);
    if (cachedUrl) {
      console.log('使用缓存中的云存储图片链接:', cachedUrl);
      return cachedUrl;
    }
    
    // 如果缓存中没有，则继续使用原始云存储路径
    // 上层代码会负责获取临时URL并缓存
    console.log('使用原始云存储路径:', imageUrl);
    return imageUrl;
  }
  
  // 处理相对路径
  if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
    console.log('处理相对路径:', imageUrl);
    return '/' + imageUrl;
  }
  
  // 其他情况，直接返回原始路径
  return imageUrl;
};

// 导出所有API
module.exports = {
  callCloudFunction,
  productApi,
  categoryApi,
  cartApi,
  orderApi,
  userApi,
  initApi,
  getProductImageUrl
}; 