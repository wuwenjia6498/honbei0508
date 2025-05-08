// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'cloud1-3g9nsaj9f3a1b0ed'  // 使用固定的环境ID
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 详细记录接收到的所有参数
  console.log('userService 被调用，完整参数：', JSON.stringify(event));
  console.log('用户openid:', openid);
  
  const { action, userData, limit, isTestMode } = event
  
  // 检查action是否为空
  if (!action) {
    console.error('缺少action参数或为空');
    return {
      success: false,
      message: '缺少action参数或为空'
    }
  }
  
  console.log(`准备执行操作: ${action}, 额外参数:`, {
    hasUserData: !!userData,
    limit: limit || 'undefined',
    isTestMode: isTestMode || false
  });
  
  try {
    switch (action) {
      case 'login':
        console.log('执行login操作');
        return await login(openid, userData)
      case 'getUserInfo':
        console.log('执行getUserInfo操作');
        return await getUserInfo(openid)
      case 'updateUserInfo':
        console.log('执行updateUserInfo操作');
        return await updateUserInfo(openid, userData)
      case 'isAdmin':
        console.log('执行isAdmin操作');
        return await isAdmin(openid)
      case 'setAsAdmin':
        console.log('执行setAsAdmin操作');
        return await setAsAdmin(openid)
      case 'getOpenid':
        console.log('执行getOpenid操作');
        return await getOpenid(openid)
      case 'getDashboardStats':
        console.log('执行getDashboardStats操作');
        // 在测试模式下跳过管理员权限检查
        if (isTestMode) {
          console.log('测试模式：跳过管理员权限检查');
          return await getDashboardStats();
        } else {
          // 检查是否是管理员
          const adminCheck = await isAdmin(openid)
          console.log('管理员检查结果:', adminCheck);
          if (adminCheck.success && adminCheck.data.isAdmin) {
            return await getDashboardStats()
          } else {
            return {
              success: false,
              message: '权限不足'
            }
          }
        }
      case 'getRecentOrders':
        console.log('执行getRecentOrders操作');
        // 在测试模式下跳过管理员权限检查
        if (isTestMode) {
          console.log('测试模式：跳过管理员权限检查');
          return await getRecentOrders(limit || 5);
        } else {
          // 检查是否是管理员
          const adminCheck2 = await isAdmin(openid)
          console.log('管理员检查结果:', adminCheck2);
          if (adminCheck2.success && adminCheck2.data.isAdmin) {
            return await getRecentOrders(limit || 5)
          } else {
            return {
              success: false,
              message: '权限不足'
            }
          }
        }
      default:
        console.error(`未知操作: ${action}`);
        return {
          success: false,
          message: '未知操作',
          requestedAction: action
        }
    }
  } catch (error) {
    console.error('用户操作失败', error)
    return {
      success: false,
      message: '用户操作失败: ' + (error.message || '未知错误'),
      error: error.message || '未知错误'
    }
  }
}

// 获取用户openid
async function getOpenid(openid) {
  return {
    success: true,
    data: {
      openid: openid
    }
  }
}

// 用户登录
async function login(openid, userData) {
  try {
    // 查询用户是否已存在
    const user = await db.collection('users')
      .where({
        openid
      })
      .get()
    
    if (user.data.length > 0) {
      // 用户已存在，更新登录时间
      await db.collection('users')
        .doc(user.data[0]._id)
        .update({
          data: {
            lastLoginTime: db.serverDate()
          }
        })
      
      return {
        success: true,
        data: user.data[0],
        isNewUser: false
      }
    } else {
      // 用户不存在，创建新用户
      const newUser = {
        openid,
        nickname: userData.nickName || '微信用户',
        avatar: userData.avatarUrl || 'cloud://cloud1-6g4mb3x4506ab74c.636c-cloud1-6g4mb3x4506ab74c-1314395232/users/default-avatar.png',
        phone: '',
        level: 'normal',
        status: 'active',
        totalSpent: 0,
        registerTime: db.serverDate(),
        lastLoginTime: db.serverDate()
      }
      
      const result = await db.collection('users').add({
        data: newUser
      })
      
      // 获取新创建的用户数据
      const newUserData = await db.collection('users').doc(result._id).get()
      
      return {
        success: true,
        data: newUserData.data,
        isNewUser: true
      }
    }
  } catch (error) {
    console.error('用户登录失败', error)
    throw error
  }
}

// 获取用户信息
async function getUserInfo(openid) {
  try {
    const user = await db.collection('users')
      .where({
        openid
      })
      .get()
    
    if (user.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }
    
    return {
      success: true,
      data: user.data[0]
    }
  } catch (error) {
    console.error('获取用户信息失败', error)
    throw error
  }
}

// 更新用户信息
async function updateUserInfo(openid, userData) {
  try {
    // 查询用户是否存在
    const user = await db.collection('users')
      .where({
        openid
      })
      .get()
    
    if (user.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }
    
    // 允许更新的字段
    const allowedFields = ['nickname', 'avatar', 'phone']
    const updateData = {}
    
    // 筛选有效的更新字段
    for (const field of allowedFields) {
      if (userData[field] !== undefined) {
        updateData[field] = userData[field]
      }
    }
    
    // 更新用户信息
    await db.collection('users')
      .doc(user.data[0]._id)
      .update({
        data: updateData
      })
    
    // 获取更新后的用户信息
    const updatedUser = await db.collection('users')
      .doc(user.data[0]._id)
      .get()
    
    return {
      success: true,
      data: updatedUser.data
    }
  } catch (error) {
    console.error('更新用户信息失败', error)
    throw error
  }
}

// 检查用户是否是管理员
async function isAdmin(openid) {
  try {
    // 如果没有openid，返回非管理员状态
    if (!openid) {
      console.log('无法获取openid，用户未登录或在云函数测试环境运行');
      return {
        success: true,
        data: {
          isAdmin: false
        }
      }
    }
    
    // 查询管理员配置
    let adminConfig = await db.collection('config')
      .doc('adminConfig')
      .get()
      .catch(async (err) => {
        console.log('adminConfig不存在，准备创建:', err);
        
        // 检查config集合是否存在
        const collections = await db.listCollections().then(res => res.map(item => item.name));
        if (!collections.includes('config')) {
          console.log('config集合不存在，创建集合');
          try {
            await db.createCollection('config');
          } catch (error) {
            console.error('创建config集合失败', error);
          }
        }
        
        // 创建管理员配置文档
        try {
          await db.collection('config').add({
            data: {
              _id: 'adminConfig',
              adminOpenids: [openid], // 将当前用户设为管理员
              createdAt: db.serverDate()
            }
          });
          
          console.log(`已创建adminConfig并将用户 ${openid} 设为管理员`);
          
          // 返回新创建的配置
          return { 
            data: { 
              adminOpenids: [openid]
            } 
          };
        } catch (error) {
          console.error('创建adminConfig文档失败', error);
          return { data: { adminOpenids: [] } };
        }
      });
    
    const isAdminUser = adminConfig.data.adminOpenids.includes(openid);
    console.log(`用户 ${openid} 是否为管理员: ${isAdminUser}`);
    
    return {
      success: true,
      data: {
        isAdmin: isAdminUser
      }
    }
  } catch (error) {
    console.error('检查管理员权限失败', error);
    return {
      success: false,
      message: '检查管理员权限失败',
      error: error.message
    }
  }
}

// 获取控制台概览统计数据
async function getDashboardStats() {
  try {
    // 获取当前日期和时间
    const now = new Date()
    
    // 计算本月开始时间
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // 计算本周开始时间（周一为每周第一天）
    const dayOfWeek = now.getDay() || 7 // 如果是周日，则转为 7
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - dayOfWeek + 1) // 设置为本周一
    weekStart.setHours(0, 0, 0, 0)
    
    // 1. 本月营收统计
    const monthlyRevenue = await db.collection('orders')
      .where({
        createdAt: _.gte(monthStart),
        status: _.neq('canceled') // 排除已取消的订单
      })
      .get()
      .then(res => {
        return res.data.reduce((total, order) => total + (order.totalAmount || 0), 0)
      })
      .catch(() => 0) // 如果出错或无数据，返回0
    
    // 2. 本周营收统计
    const weeklyRevenue = await db.collection('orders')
      .where({
        createdAt: _.gte(weekStart),
        status: _.neq('canceled') // 排除已取消的订单
      })
      .get()
      .then(res => {
        return res.data.reduce((total, order) => total + (order.totalAmount || 0), 0)
      })
      .catch(() => 0) // 如果出错或无数据，返回0
    
    // 3. 本月销售量（已完成订单数量）
    const monthlySales = await db.collection('orders')
      .where({
        createdAt: _.gte(monthStart),
        status: 'completed' // 只计算已完成的订单
      })
      .count()
      .then(res => res.total)
      .catch(() => 0) // 如果出错或无数据，返回0
    
    // 4. 库存商品数量
    const inventory = await db.collection('products')
      .where({
        stock: _.gt(0) // 只计算有库存的商品
      })
      .count()
      .then(res => res.total)
      .catch(() => 0) // 如果出错或无数据，返回0
    
    // 返回统计结果
    return {
      success: true,
      data: {
        monthlyRevenue: parseFloat((monthlyRevenue || 0).toFixed(2)),
        weeklyRevenue: parseFloat((weeklyRevenue || 0).toFixed(2)),
        monthlySales: monthlySales || 0,
        inventory: inventory || 0
      }
    }
  } catch (error) {
    console.error('获取控制台统计数据失败', error)
    return {
      success: false,
      message: '获取控制台统计数据失败: ' + (error.message || '未知错误'),
      error: error.message || '未知错误'
    }
  }
}

// 获取最近订单
async function getRecentOrders(limit = 5) {
  try {
    const orders = await db.collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
      .then(res => {
        // 处理订单数据，格式化日期和时间
        return res.data.map(order => ({
          ...order,
          formattedCreatedAt: formatTime(order.createdAt),
          statusText: getOrderStatusText(order.status)
        }))
      })
      .catch(() => []) // 如果出错或无数据，返回空数组
    
    return {
      success: true,
      data: orders
    }
  } catch (error) {
    console.error('获取最近订单失败', error)
    return {
      success: false,
      message: '获取最近订单失败: ' + (error.message || '未知错误'),
      error: error.message || '未知错误'
    }
  }
}

// 获取订单状态文本
function getOrderStatusText(status) {
  const statusMap = {
    'pending': '待付款',
    'processing': '处理中',
    'shipping': '配送中',
    'completed': '已完成',
    'canceled': '已取消'
  };
  
  return statusMap[status] || status;
}

// 格式化时间
function formatTime(date) {
  if (!date) return '';
  
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  
  return `${year}-${padZero(month)}-${padZero(day)} ${padZero(hour)}:${padZero(minute)}`;
}

// 数字补零
function padZero(num) {
  return num < 10 ? '0' + num : num;
}

// 将用户设置为管理员
async function setAsAdmin(openid) {
  try {
    // 如果没有openid，返回错误
    if (!openid) {
      console.error('无法获取openid，用户未登录');
      return {
        success: false,
        message: '用户未登录，无法设置管理员权限'
      }
    }
    
    // 检查config集合是否存在
    const collections = await db.listCollections().then(res => res.map(item => item.name));
    if (!collections.includes('config')) {
      console.log('config集合不存在，创建集合');
      try {
        await db.createCollection('config');
      } catch (error) {
        console.error('创建config集合失败', error);
        return {
          success: false,
          message: '创建配置集合失败'
        };
      }
    }
    
    // 查询是否已有adminConfig文档
    const adminConfigExists = await db.collection('config')
      .doc('adminConfig')
      .get()
      .then(() => true)
      .catch(() => false);
    
    if (adminConfigExists) {
      // 已有adminConfig，更新管理员列表
      const result = await db.collection('config')
        .doc('adminConfig')
        .update({
          data: {
            adminOpenids: db.command.addToSet(openid),
            updatedAt: db.serverDate()
          }
        });
      
      console.log(`已将用户 ${openid} 添加到管理员列表`);
      
      return {
        success: true,
        message: '已将您添加到管理员列表'
      };
    } else {
      // 没有adminConfig，创建新文档
      const result = await db.collection('config').add({
        data: {
          _id: 'adminConfig',
          adminOpenids: [openid],
          createdAt: db.serverDate()
        }
      });
      
      console.log(`已创建adminConfig并将用户 ${openid} 设为管理员`);
      
      return {
        success: true,
        message: '已将您设置为管理员'
      };
    }
  } catch (error) {
    console.error('设置管理员失败', error);
    return {
      success: false,
      message: '设置管理员失败: ' + (error.message || '未知错误'),
      error: error.message || '未知错误'
    }
  }
} 