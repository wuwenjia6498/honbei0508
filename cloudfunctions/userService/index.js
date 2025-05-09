// 云函数入口文件
const cloud = require('wx-server-sdk')

// 初始化云环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 声明数据库和指令变量
const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('userService函数被调用，参数：', event)
  
  // 获取OpenID
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  console.log('当前用户OpenID:', openid)
  
  // 解构请求参数
  const { action, userInfo, limit = 5, isTestMode = false } = event
  
  // 检查必需参数
  if (!action) {
    return {
      success: false,
      message: '缺少action参数'
    }
  }
  
  // 根据不同action执行不同操作
  try {
    switch (action) {
      case 'login':
        return await login(openid, userInfo)
      
      case 'getUserInfo':
        return await getUserInfo(openid)
      
      case 'updateUserInfo':
        return await updateUserInfo(openid, userInfo)
      
      case 'getOpenid':
        return await getOpenid(openid)
      
      case 'isAdmin':
        return await isAdmin(openid)
        
      case 'setAsAdmin':
        return await setAsAdmin(openid)
      
      case 'getDashboardStats':
        // 检查管理员权限
        if (isTestMode) {
          return await getDashboardStats()
        } else {
          const adminCheck = await isAdmin(openid)
          if (adminCheck.success && adminCheck.data.isAdmin) {
            return await getDashboardStats()
          } else {
            return { success: false, message: '权限不足' }
          }
        }
      
      case 'getRecentOrders':
        // 检查管理员权限
        if (isTestMode) {
          return await getRecentOrders(limit)
        } else {
          const adminCheck = await isAdmin(openid)
          if (adminCheck.success && adminCheck.data.isAdmin) {
            return await getRecentOrders(limit)
          } else {
            return { success: false, message: '权限不足' }
          }
        }
      
      default:
        return {
          success: false,
          message: `未知操作: ${action}`
        }
    }
  } catch (error) {
    console.error(`执行${action}操作失败:`, error)
    return {
      success: false,
      message: error.message || '操作执行失败',
      error: error.toString()
    }
  }
}

/**
 * 获取用户OpenID
 */
async function getOpenid(openid) {
  return {
    success: true,
    data: { openid }
  }
}

/**
 * 用户登录
 */
async function login(openid, userInfo) {
  try {
    // 验证参数
    if (!openid) {
      return { success: false, message: '无法获取用户OpenID' }
    }
    
    if (!userInfo) {
      return { success: false, message: '用户信息不能为空' }
    }
    
    console.log('正在处理登录请求，用户数据:', userInfo)
    
    // 查询用户是否已存在
    const userQuery = await db.collection('users').where({ openid }).get()
    
    if (userQuery.data.length > 0) {
      // 用户已存在，更新信息
      const existingUser = userQuery.data[0]
      
      await db.collection('users').doc(existingUser._id).update({
        data: {
          lastLoginTime: db.serverDate(),
          nickname: userInfo.nickName || existingUser.nickname,
          avatar: userInfo.avatarUrl || existingUser.avatar
        }
      })
      
      // 获取更新后的数据
      const updatedUser = await db.collection('users').doc(existingUser._id).get()
      
      return {
        success: true,
        data: updatedUser.data,
        isNewUser: false
      }
    } else {
      // 创建新用户
      const defaultAvatar = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
      
      const newUser = {
        openid,
        nickname: userInfo.nickName || '微信用户',
        avatar: userInfo.avatarUrl || defaultAvatar,
        phone: '',
        level: 'normal',
        status: 'active',
        totalSpent: 0,
        registerTime: db.serverDate(),
        lastLoginTime: db.serverDate()
      }
      
      const result = await db.collection('users').add({ data: newUser })
      const createdUser = await db.collection('users').doc(result._id).get()
      
      return {
        success: true,
        data: createdUser.data,
        isNewUser: true
      }
    }
  } catch (error) {
    console.error('登录操作失败:', error)
    return {
      success: false,
      message: '登录失败: ' + error.message,
      error: error.toString()
    }
  }
}

/**
 * 获取用户信息
 */
async function getUserInfo(openid) {
  try {
    if (!openid) {
      return { success: false, message: '无法获取用户OpenID' }
    }
    
    const userQuery = await db.collection('users').where({ openid }).get()
    
    if (userQuery.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    return {
      success: true,
      data: userQuery.data[0]
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return {
      success: false,
      message: '获取用户信息失败: ' + error.message,
      error: error.toString()
    }
  }
}

/**
 * 更新用户信息
 */
async function updateUserInfo(openid, userInfo) {
  try {
    if (!openid) {
      return { success: false, message: '无法获取用户OpenID' }
    }
    
    if (!userInfo) {
      return { success: false, message: '更新信息不能为空' }
    }
    
    // 查询用户是否存在
    const userQuery = await db.collection('users').where({ openid }).get()
    
    if (userQuery.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }
    
    const existingUser = userQuery.data[0]
    
    // 允许更新的字段
    const allowedFields = ['nickname', 'avatar', 'phone']
    const updateData = {}
    
    // 筛选有效的更新字段
    for (const field of allowedFields) {
      if (userInfo[field] !== undefined) {
        updateData[field] = userInfo[field]
      }
    }
    
    // 如果没有有效字段要更新，直接返回成功
    if (Object.keys(updateData).length === 0) {
      return {
        success: true,
        data: existingUser,
        message: '没有字段需要更新'
      }
    }
    
    // 更新用户信息
    await db.collection('users').doc(existingUser._id).update({
      data: updateData
    })
    
    // 获取更新后的信息
    const updatedUser = await db.collection('users').doc(existingUser._id).get()
    
    return {
      success: true,
      data: updatedUser.data
    }
  } catch (error) {
    console.error('更新用户信息失败:', error)
    return {
      success: false,
      message: '更新用户信息失败: ' + error.message,
      error: error.toString()
    }
  }
}

/**
 * 检查用户是否是管理员
 */
async function isAdmin(openid) {
  try {
    if (!openid) {
      return {
        success: true,
        data: { isAdmin: false },
        message: '无法获取用户OpenID'
      }
    }
    
    // 尝试查询管理员配置
    try {
      const configQuery = await db.collection('config').doc('adminConfig').get()
      const adminOpenids = configQuery.data.adminOpenids || []
      
      return {
        success: true,
        data: {
          isAdmin: adminOpenids.includes(openid)
        }
      }
    } catch (error) {
      // 配置可能不存在，尝试创建
      if (error.errCode === -1 || error.message.includes('not exist')) {
        try {
          // 创建管理员配置，将当前用户设为管理员
          await db.collection('config').add({
            data: {
              _id: 'adminConfig',
              adminOpenids: [openid],
              createdAt: db.serverDate()
            }
          })
          
          return {
            success: true,
            data: { isAdmin: true },
            message: '已创建管理员配置并设置您为管理员'
          }
        } catch (createError) {
          console.error('创建管理员配置失败:', createError)
          // 可能是集合不存在，尝试创建集合
          try {
            await db.createCollection('config')
            await db.collection('config').add({
              data: {
                _id: 'adminConfig',
                adminOpenids: [openid],
                createdAt: db.serverDate()
              }
            })
            
            return {
              success: true,
              data: { isAdmin: true },
              message: '已创建config集合和管理员配置'
            }
          } catch (finalError) {
            console.error('创建集合失败:', finalError)
            return {
              success: true,
              data: { isAdmin: false },
              message: '无法创建管理员配置'
            }
          }
        }
      } else {
        throw error
      }
    }
  } catch (error) {
    console.error('检查管理员状态失败:', error)
    return {
      success: true, // 返回成功但非管理员状态
      data: { isAdmin: false },
      error: error.toString()
    }
  }
}

/**
 * 将用户设置为管理员
 */
async function setAsAdmin(openid) {
  try {
    if (!openid) {
      return { success: false, message: '无法获取用户OpenID' }
    }
    
    // 检查config集合是否存在
    try {
      // 检查adminConfig文档是否存在
      const configExists = await db.collection('config').doc('adminConfig').get()
        .then(() => true)
        .catch(() => false)
      
      if (configExists) {
        // 更新管理员列表
        await db.collection('config').doc('adminConfig').update({
          data: {
            adminOpenids: _.addToSet(openid),
            updatedAt: db.serverDate()
          }
        })
        
        return {
          success: true,
          message: '已将您设置为管理员'
        }
      } else {
        // 创建新的管理员配置
        await db.collection('config').add({
          data: {
            _id: 'adminConfig',
            adminOpenids: [openid],
            createdAt: db.serverDate()
          }
        })
        
        return {
          success: true,
          message: '已创建管理员配置并设置您为管理员'
        }
      }
    } catch (error) {
      // 可能是集合不存在，尝试创建集合
      try {
        await db.createCollection('config')
        await db.collection('config').add({
          data: {
            _id: 'adminConfig',
            adminOpenids: [openid],
            createdAt: db.serverDate()
          }
        })
        
        return {
          success: true,
          message: '已创建config集合并设置您为管理员'
        }
      } catch (finalError) {
        console.error('所有尝试均失败:', finalError)
        return {
          success: false,
          message: '设置管理员失败: ' + finalError.message,
          error: finalError.toString()
        }
      }
    }
  } catch (error) {
    console.error('设置管理员失败:', error)
    return {
      success: false,
      message: '设置管理员失败: ' + error.message,
      error: error.toString()
    }
  }
}

/**
 * 获取控制台概览统计数据
 */
async function getDashboardStats() {
  try {
    // 获取当前日期和时间
    const now = new Date()
    console.log('开始获取控制台统计数据, 当前时间:', now)
    
    // 计算本月开始时间
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    console.log('本月开始时间:', monthStart)
    
    // 计算本周开始时间（周一为每周第一天）
    const dayOfWeek = now.getDay() || 7 // 如果是周日，则转为 7
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - dayOfWeek + 1) // 设置为本周一
    weekStart.setHours(0, 0, 0, 0)
    console.log('本周开始时间:', weekStart)
    
    // 1. 本月营收统计
    let monthlyRevenue = 0
    try {
      // 注意：订单中使用的是 createTime 而不是 createdAt
      const monthlyOrdersQuery = {
        createTime: _.gte(monthStart),
        status: _.neq('canceled') // 排除已取消的订单
      }
      console.log('本月营收查询条件:', JSON.stringify(monthlyOrdersQuery))
      
      const monthlyOrders = await db.collection('orders')
        .where(monthlyOrdersQuery)
        .get()
      
      console.log('本月订单查询结果数量:', monthlyOrders.data ? monthlyOrders.data.length : 0)
      
      if (monthlyOrders.data && monthlyOrders.data.length > 0) {
        // 不打印全部数据避免日志过大
        console.log('本月订单数量:', monthlyOrders.data.length)
        
        // 显示订单创建时间格式，排查日期比较问题
        monthlyOrders.data.forEach(order => {
          console.log(`订单 ${order.orderNumber}: createTime类型=${typeof order.createTime}, 值=${JSON.stringify(order.createTime)}, totalAmount=${order.totalAmount}`)
        })
        
        monthlyRevenue = monthlyOrders.data.reduce((total, order) => {
          const orderAmount = parseFloat(order.totalAmount) || 0
          console.log(`订单 ${order.orderNumber} 金额: ${orderAmount}`)
          return total + orderAmount
        }, 0)
      } else {
        console.log('本月没有找到订单数据')
      }
    } catch (err) {
      console.error('获取本月营收失败:', err)
      monthlyRevenue = 0
    }
    
    // 2. 本周营收统计
    let weeklyRevenue = 0
    try {
      // 注意：订单中使用的是 createTime 而不是 createdAt
      const weeklyOrdersQuery = {
        createTime: _.gte(weekStart),
        status: _.neq('canceled') // 排除已取消的订单
      }
      console.log('本周营收查询条件:', JSON.stringify(weeklyOrdersQuery))
      
      const weeklyOrders = await db.collection('orders')
        .where(weeklyOrdersQuery)
        .get()
      
      console.log('本周订单查询结果数量:', weeklyOrders.data ? weeklyOrders.data.length : 0)
      
      if (weeklyOrders.data && weeklyOrders.data.length > 0) {
        // 不打印全部数据避免日志过大
        console.log('本周订单数量:', weeklyOrders.data.length)
        
        // 显示订单创建时间格式，排查日期比较问题
        weeklyOrders.data.forEach(order => {
          console.log(`订单 ${order.orderNumber}: createTime类型=${typeof order.createTime}, 值=${JSON.stringify(order.createTime)}, totalAmount=${order.totalAmount}`)
        })
        
        weeklyRevenue = weeklyOrders.data.reduce((total, order) => {
          const orderAmount = parseFloat(order.totalAmount) || 0
          console.log(`订单 ${order.orderNumber} 金额: ${orderAmount}`)
          return total + orderAmount
        }, 0)
      } else {
        console.log('本周没有找到订单数据')
      }
    } catch (err) {
      console.error('获取本周营收失败:', err)
      weeklyRevenue = 0
    }
    
    // 3. 本月销售量（已完成订单数量）
    const monthlySales = await db.collection('orders')
      .where({
        createTime: _.gte(monthStart), // 使用createTime而不是createdAt
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
    const result = {
      success: true,
      data: {
        monthlyRevenue: parseFloat((monthlyRevenue || 0).toFixed(2)),
        weeklyRevenue: parseFloat((weeklyRevenue || 0).toFixed(2)),
        monthlySales: monthlySales || 0,
        inventory: inventory || 0
      }
    }
    
    console.log('统计结果:', result)
    return result
  } catch (error) {
    console.error('获取控制台统计数据失败:', error)
    return {
      success: false,
      message: '获取控制台统计数据失败: ' + error.message,
      error: error.toString()
    }
  }
}

/**
 * 获取最近订单
 */
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
    console.error('获取最近订单失败:', error)
    return {
      success: false,
      message: '获取最近订单失败: ' + error.message,
      error: error.toString()
    }
  }
}

/**
 * 获取订单状态文本
 */
function getOrderStatusText(status) {
  const statusMap = {
    'pending': '待付款',
    'processing': '处理中',
    'shipping': '配送中',
    'completed': '已完成',
    'canceled': '已取消'
  }
  
  return statusMap[status] || status
}

/**
 * 格式化时间
 */
function formatTime(date) {
  if (!date) return ''
  
  if (typeof date === 'string') {
    date = new Date(date)
  }
  
  const year = date.getFullYear()
  const month = padZero(date.getMonth() + 1)
  const day = padZero(date.getDate())
  const hour = padZero(date.getHours())
  const minute = padZero(date.getMinutes())
  
  return `${year}-${month}-${day} ${hour}:${minute}`
}

/**
 * 数字补零
 */
function padZero(num) {
  return num < 10 ? '0' + num : num
} 