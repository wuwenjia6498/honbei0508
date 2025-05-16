// 云函数入口文件
const cloud = require('wx-server-sdk')
const bakeryData = require('./bakeryData')

// 优化云环境初始化方法
try {
  // 先尝试使用动态环境
  cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
  })
  console.log('使用动态环境初始化成功');
} catch (err) {
  console.error('使用动态环境初始化失败:', err);
  
  try {
    // 尝试使用指定环境ID
    cloud.init({
      env: 'cloud1-3g9nsaj9f3a1b0ed'
    })
    console.log('使用指定环境ID初始化成功');
  } catch (dynamicErr) {
    console.error('使用指定环境ID初始化失败:', dynamicErr);
    
    // 最后尝试不指定环境
    try {
      cloud.init()
      console.log('不指定环境初始化成功');
    } catch (defaultErr) {
      console.error('不指定环境初始化也失败:', defaultErr);
    }
  }
}

// 获取数据库引用
let db = null;
try {
  db = cloud.database();
  console.log('获取数据库引用成功');
} catch (dbErr) {
  console.error('获取数据库引用失败:', dbErr);
}

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('云函数initData被调用，参数:', event);
  
  // 验证数据库连接是否正常
  if (!db) {
    return {
      success: false,
      message: '获取数据库引用失败，请检查云环境配置',
      envInfo: {
        currentEnv: cloud.DYNAMIC_CURRENT_ENV || '未知',
        wxContext: cloud.getWXContext() || '未获取到'
      }
    };
  }
  
  try {
    // 根据action参数决定执行哪个操作
    if (event.action === 'createAdminConfig') {
      return await createAdminConfig(event.openid);
    } else if (event.action === 'initOrderCollection') {
      return await initOrderCollection();
    } else if (event.action === 'diagnoseDatabase') {
      return await diagnoseDatabase();
    } else if (event.action === 'testDatabaseConnection') {
      // 简单测试数据库连接
      return await testDatabaseConnection();
    } else if (event.action === 'clearAll') {
      // 清空所有数据
      return await clearAllCollections();
    } else if (event.action === 'unifyInit') {
      // 使用统一的初始化方法（基于cleanDatabase云函数）
      return await unifyDatabaseInitialization();
    } else if (event.action === 'initProducts') {
      // 只初始化商品数据
      try {
        await initProducts();
        return {
          success: true,
          message: '商品数据初始化成功'
        };
      } catch (error) {
        console.error('初始化商品数据失败:', error);
        return {
          success: false,
          message: error.message,
          stack: error.stack,
          error: error
        };
      }
    } else if (event.action === 'initAll') {
      // 初始化所有数据
      try {
        // 初始化分类数据
        await initCategories();
        
        // 初始化商品数据
        await initProducts();
        
        // 初始化订单数据
        await initOrderCollection();
        
        return {
          success: true,
          message: '数据初始化成功'
        };
      } catch (error) {
        console.error('初始化所有数据失败:', error);
        return {
          success: false,
          message: error.message,
          stack: error.stack,
          error: error
        };
      }
    }
    
    // 默认执行初始化所有数据
    // 初始化分类数据
    await initCategories();
    
    // 初始化商品数据
    await initProducts();
    
    return {
      success: true,
      message: '数据初始化成功'
    };
  } catch (error) {
    console.error('云函数执行出错:', error);
    return {
      success: false,
      message: error.message,
      stack: error.stack,
      error: error
    };
  }
};

// 创建管理员配置
async function createAdminConfig(openid) {
  try {
    console.log('创建管理员配置，管理员openid:', openid);
    
    // 确保openid存在
    if (!openid) {
      const wxContext = cloud.getWXContext();
      openid = wxContext.OPENID;
    }
    
    if (!openid) {
      throw new Error('无法获取用户OpenID');
    }
    
    // 检查config集合是否存在，如果不存在则创建
    try {
      // 尝试获取集合信息
      await db.collection('config').count();
    } catch (err) {
      // 如果集合不存在，创建集合
      console.log('config集合不存在，创建集合');
      await db.createCollection('config');
    }
    
    // 检查是否已存在adminConfig文档
    const configCheck = await db.collection('config').doc('adminConfig').get().catch(() => null);
    
    if (configCheck && configCheck.data) {
      // 配置已存在，更新管理员列表
      console.log('管理员配置已存在，更新管理员列表');
      
      let adminOpenids = configCheck.data.adminOpenids || [];
      if (!adminOpenids.includes(openid)) {
        adminOpenids.push(openid);
      }
      
      await db.collection('config').doc('adminConfig').update({
        data: {
          adminOpenids: adminOpenids,
          updateTime: db.serverDate()
        }
      });
    } else {
      // 配置不存在，创建配置
      console.log('管理员配置不存在，创建新配置');
      await db.collection('config').add({
        data: {
          _id: 'adminConfig',
          adminOpenids: [openid],
          created: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
    }
    
    return {
      success: true,
      message: '管理员配置创建/更新成功',
      adminOpenid: openid
    };
  } catch (error) {
    console.error('创建管理员配置失败:', error);
    return {
      success: false,
      message: '创建管理员配置失败',
      error: error.message
    };
  }
}

// 初始化分类
async function initCategories() {
  try {
    // 清空现有数据
    await clearCollection('categories');
    
    // 添加分类数据
    for (const category of bakeryData.categories) {
      await db.collection('categories').add({
        data: {
          ...category,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
      console.log(`添加分类: ${category.name}`);
    }
    
    return true;
  } catch (error) {
    console.error('初始化分类数据失败:', error);
    throw error;
  }
}

// 初始化商品
async function initProducts() {
  try {
    // 清空现有数据
    await clearCollection('products');
    
    // 添加商品数据
    for (const product of bakeryData.products) {
      // 确保isNew和isFeatured是布尔值
      const productData = {
        ...product,
        isNew: product.isNew === true, // 确保是布尔值
        isFeatured: product.isFeatured === true, // 确保是布尔值
        isHot: product.isHot === true, // 确保是布尔值
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      };
      
      await db.collection('products').add({
        data: productData
      });
      console.log(`添加商品: ${product.name}, isNew: ${productData.isNew}, isHot: ${productData.isHot}`);
    }
    
    return true;
  } catch (error) {
    console.error('初始化商品数据失败:', error);
    throw error;
  }
}

// 清空集合
async function clearCollection(collectionName) {
  try {
    console.log(`清空集合: ${collectionName}`);
    const result = await db.collection(collectionName).where({}).remove();
    console.log(`删除记录数: ${result.stats ? result.stats.removed : 0}`);
    return result;
  } catch (error) {
    console.error(`清空集合 ${collectionName} 失败:`, error);
    return null;
  }
}

// 初始化订单集合
async function initOrderCollection() {
  try {
    console.log('开始初始化订单集合');
    
    // 安全检查 - 确保数据库连接正常
    if (!db) {
      return {
        success: false,
        message: '数据库连接失败，无法初始化订单'
      };
    }
    
    // 清空现有订单数据
    console.log('清空现有订单数据...');
    await clearCollection('orders');
    
    console.log('订单数据已清空，不再添加测试订单');
    
    // 返回结果
    return {
      success: true,
      message: '订单数据已清空，不再添加测试订单',
      orderIds: [],
      orderPrefix: ''
    };
  } catch (error) {
    console.error('初始化订单集合失败:', error);
    return {
      success: false,
      message: '初始化订单集合失败: ' + error.message
    };
  }
}

// 清空所有集合
async function clearAllCollections() {
  // 只清空订单集合，保留其他数据
  const collections = ['orders'];
  const results = {};
  
  for (const collection of collections) {
    try {
      console.log(`清空${collection}集合...`);
      const result = await clearCollection(collection);
      const count = result && result.stats ? result.stats.removed : 0;
      console.log(`成功删除${count}条${collection}数据`);
      results[collection] = result ? { success: true, removed: count } : { success: false };
    } catch (err) {
      console.error(`清空集合 ${collection} 失败:`, err);
      results[collection] = { success: false, error: err.message };
    }
  }
  
  // 检查清空后是否还有订单
  try {
    const remainingCheck = await db.collection('orders').count();
    if (remainingCheck.total > 0) {
      console.log(`清空操作后仍有 ${remainingCheck.total} 个订单，尝试逐个删除`);
      
      // 获取所有订单ID并逐个删除
      const allOrders = await db.collection('orders').limit(100).get();
      if (allOrders.data && allOrders.data.length > 0) {
        let deleteCount = 0;
        for (const order of allOrders.data) {
          try {
            await db.collection('orders').doc(order._id).remove();
            deleteCount++;
          } catch (removeErr) {
            console.error(`删除订单 ${order._id} 失败:`, removeErr);
          }
        }
        console.log(`已逐个删除 ${deleteCount} 个订单`);
      }
    }
  } catch (checkErr) {
    console.error('检查剩余订单失败:', checkErr);
  }
  
  return {
    success: true,
    message: '订单数据清空成功',
    results: results
  };
}

// 诊断数据库连接和订单数据
async function diagnoseDatabase() {
  const result = {
    success: true,
    collections: {},
    ordersInfo: {
      count: 0,
      exists: false
    },
    environment: cloud.getWXContext()
  };
  
  try {
    // 获取云环境信息
    result.cloudEnv = cloud.DYNAMIC_CURRENT_ENV || 'unknown';
    
    // 不再使用getTables方法(微信云开发SDK中不存在)，而是直接检查关键集合
    const collectionsToCheck = ['orders', 'config', 'products', 'categories'];
    result.collections.checked = [];
    
    for (const collName of collectionsToCheck) {
      try {
        const countResult = await db.collection(collName).count();
        result.collections.checked.push({
          name: collName,
          exists: true,
          count: countResult.total
        });
      } catch (err) {
        console.error(`检查集合 ${collName} 失败:`, err);
        result.collections.checked.push({
          name: collName,
          exists: false,
          error: err.message
        });
      }
    }
    
    // 检查订单集合
    try {
      const orderCount = await db.collection('orders').count();
      result.collections.ordersExists = true;
      result.ordersInfo.exists = true;
      result.ordersInfo.count = orderCount.total;
      
      // 获取一个订单样本
      if (orderCount.total > 0) {
        try {
          const sampleOrder = await db.collection('orders').limit(1).get();
          if (sampleOrder.data && sampleOrder.data.length > 0) {
            result.ordersInfo.sample = sampleOrder.data[0];
            result.ordersInfo.hasSample = true;
          }
        } catch (sampleErr) {
          console.error('获取订单样本失败:', sampleErr);
          result.ordersInfo.sampleError = sampleErr.message;
        }
      }
    } catch (err) {
      console.error('检查订单集合失败:', err);
      result.collections.ordersExists = false;
      result.ordersInfo.exists = false;
      result.ordersInfo.error = err.message;
    }
    
    // 检查config集合
    try {
      const configCount = await db.collection('config').count();
      result.collections.configExists = true;
      result.configInfo = {
        count: configCount.total
      };
      
      // 获取管理员配置
      try {
        const adminConfig = await db.collection('config').doc('adminConfig').get();
        result.configInfo.adminConfigExists = true;
        result.configInfo.adminConfig = adminConfig.data;
      } catch (err) {
        result.configInfo.adminConfigExists = false;
        result.configInfo.adminConfigError = err.message;
      }
    } catch (err) {
      console.error('检查config集合失败:', err);
      result.collections.configExists = false;
      result.configInfo = {
        error: err.message
      };
    }
    
    return result;
  } catch (error) {
    console.error('诊断数据库失败:', error);
    return {
      success: false,
      message: '诊断数据库失败',
      error: error.message,
      ordersInfo: {
        count: 0,
        exists: false,
        error: error.message
      }
    };
  }
}

// 测试数据库连接
async function testDatabaseConnection() {
  try {
    console.log('测试数据库连接...');
    
    if (!db) {
      return {
        success: false,
        message: '数据库引用获取失败',
        dbStatus: 'not initialized'
      };
    }
    
    // 不使用getTables方法，而是直接检查几个关键集合
    const collectionsToCheck = ['orders', 'config', 'products', 'categories'];
    let collectionsStatus = [];
    
    for (const collName of collectionsToCheck) {
      try {
        const countResult = await db.collection(collName).count();
        collectionsStatus.push({
          name: collName,
          exists: true,
          count: countResult.total
        });
      } catch (err) {
        console.error(`检查集合 ${collName} 失败:`, err);
        collectionsStatus.push({
          name: collName,
          exists: false,
          error: err.message
        });
      }
    }
    
    // 尝试检查系统集合
    let testSystemCollection = false;
    try {
      // 检查config集合 (通常用于系统配置)
      const configExists = await db.collection('config').where({_id: 'adminConfig'}).count();
      testSystemCollection = true;
      console.log('config集合检查结果:', configExists);
    } catch (configErr) {
      console.log('config集合访问失败，这可能是正常的:', configErr);
      // 这个错误是可以接受的，我们继续测试
    }
    
    // 尝试访问orders集合
    let canAccessOrders = false;
    let ordersPermissionError = null;
    try {
      const ordersCount = await db.collection('orders').count();
      canAccessOrders = true;
      console.log('orders集合访问成功，数量:', ordersCount.total);
    } catch (ordersErr) {
      console.error('orders集合访问失败:', ordersErr);
      ordersPermissionError = ordersErr.message;
      // 这是关键集合，无法访问可能是权限问题
    }
    
    // 返回综合检查结果
    return {
      success: true,  // 这里返回true表示函数执行成功，不代表所有测试都通过
      message: '数据库连接测试完成',
      dbStatus: 'connected',
      canAccessOrders: canAccessOrders,
      ordersPermissionError: ordersPermissionError,
      collections: collectionsStatus,
      testSystemCollection: testSystemCollection,
      context: {
        wxContext: cloud.getWXContext(),
        env: cloud.DYNAMIC_CURRENT_ENV || 'unknown'
      }
    };
  } catch (error) {
    console.error('测试数据库连接时出错:', error);
    return {
      success: false,
      message: '测试数据库连接失败: ' + error.message,
      dbStatus: 'error',
      error: error
    };
  }
}

// 统一数据库初始化函数 - 使用cleanDatabase进行一致性初始化
async function unifyDatabaseInitialization() {
  try {
    console.log('开始执行统一数据库初始化');
    
    // 调用cleanDatabase云函数进行初始化
    const cleanResult = await cloud.callFunction({
      name: 'cleanDatabase',
      data: {
        action: 'init'  // 使用cleanDatabase中的init行为
      }
    });
    
    console.log('统一数据库初始化结果:', cleanResult);
    
    if (cleanResult.result && cleanResult.result.success) {
      return {
        success: true,
        message: '数据统一初始化成功',
        details: cleanResult.result
      };
    } else {
      throw new Error('cleanDatabase云函数调用失败: ' + (cleanResult.result ? cleanResult.result.message : '未知错误'));
    }
  } catch (error) {
    console.error('统一数据库初始化失败:', error);
    throw error;
  }
} 