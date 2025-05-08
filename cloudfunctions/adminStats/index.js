// 云函数入口文件
const cloud = require('wx-server-sdk')

// 初始化云环境
try {
  cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
  })
  console.log('使用动态环境初始化成功')
} catch (err) {
  console.error('动态环境初始化失败，尝试默认初始化:', err)
  cloud.init()
  console.log('使用默认方式初始化成功')
}

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 记录调用日志
  console.log('adminStats 被调用，参数：', {
    action: event.action,
    openid: openid || '未获取到openid',
    params: JSON.stringify(event).substring(0, 1000),
  });
  
  // 验证管理员权限
  const isAdmin = await isAdminUser(openid)
  if (!isAdmin) {
    console.warn('非管理员用户尝试访问管理员API:', openid);
    return {
      success: false,
      message: '权限不足：非管理员用户'
    }
  }
  
  const { action } = event
  
  try {
    switch (action) {
      case 'getDashboardStats':
        return await getDashboardStats()
      case 'getRecentOrders':
        return await getRecentOrders(event.limit || 5)
      case 'getProductStats':
        return await getProductStats()
      case 'getUserStats':
        return await getUserStats()
      default:
        console.error('未知操作:', action)
        return {
          success: false,
          message: '未知操作',
          requestedAction: action || '未指定action'
        }
    }
  } catch (error) {
    console.error('管理员统计操作失败', error)
    return {
      success: false,
      message: '统计操作失败: ' + (error.message || '未知错误'),
      error: error.message || '未知错误'
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
    
    // 3. 本月销售量（已完成订单数量）
    const monthlySales = await db.collection('orders')
      .where({
        createdAt: _.gte(monthStart),
        status: 'completed' // 只计算已完成的订单
      })
      .count()
      .then(res => res.total)
    
    // 4. 库存商品数量
    const inventory = await db.collection('products')
      .where({
        stock: _.gt(0) // 只计算有库存的商品
      })
      .count()
      .then(res => res.total)
    
    // 返回统计结果
    return {
      success: true,
      data: {
        monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
        weeklyRevenue: parseFloat(weeklyRevenue.toFixed(2)),
        monthlySales,
        inventory
      }
    }
  } catch (error) {
    console.error('获取控制台统计数据失败', error)
    throw error
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
    
    return {
      success: true,
      data: orders
    }
  } catch (error) {
    console.error('获取最近订单失败', error)
    throw error
  }
}

// 获取商品统计数据
async function getProductStats() {
  try {
    // 1. 总商品数量
    const totalProducts = await db.collection('products').count().then(res => res.total)
    
    // 2. 库存紧张商品（库存小于等于5的商品）
    const lowStockProducts = await db.collection('products')
      .where({
        stock: _.gt(0).and(_.lte(5))
      })
      .count()
      .then(res => res.total)
    
    // 3. 已售罄商品
    const soldOutProducts = await db.collection('products')
      .where({
        stock: 0
      })
      .count()
      .then(res => res.total)
    
    // 4. 商品分类数量
    const categories = await db.collection('categories').count().then(res => res.total)
    
    return {
      success: true,
      data: {
        totalProducts,
        lowStockProducts,
        soldOutProducts,
        categories
      }
    }
  } catch (error) {
    console.error('获取商品统计数据失败', error)
    throw error
  }
}

// 获取用户统计数据
async function getUserStats() {
  try {
    // 1. 总用户数
    const totalUsers = await db.collection('users').count().then(res => res.total)
    
    // 2. VIP用户数
    const vipUsers = await db.collection('users')
      .where({
        level: 'premium'
      })
      .count()
      .then(res => res.total)
    
    // 3. 新增用户数（最近7天）
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)
    
    const newUsers = await db.collection('users')
      .where({
        registerTime: _.gte(sevenDaysAgo)
      })
      .count()
      .then(res => res.total)
    
    // 4. 活跃用户数（有订单的用户）
    const activeUsers = await db.collection('orders')
      .aggregate()
      .group({
        _id: '$openid',
        count: $.sum(1)
      })
      .end()
      .then(res => res.list.length)
    
    return {
      success: true,
      data: {
        totalUsers,
        vipUsers,
        newUsers,
        activeUsers
      }
    }
  } catch (error) {
    console.error('获取用户统计数据失败', error)
    throw error
  }
}

// 检查用户是否为管理员
async function isAdminUser(openid) {
  if (!openid) return false
  
  try {
    const adminUser = await db.collection('admin_users')
      .where({
        openid: openid
      })
      .get()
    
    return adminUser.data && adminUser.data.length > 0
  } catch (error) {
    console.error('验证管理员权限失败', error)
    return false
  }
}

// 获取订单状态文本
function getOrderStatusText(status) {
  const statusMap = {
    'pending': '待付款',
    'paid': '已付款',
    'shipped': '已发货',
    'completed': '已完成',
    'canceled': '已取消'
  }
  
  return statusMap[status] || status
}

// 格式化时间
function formatTime(date) {
  if (!date) return ''
  
  date = new Date(date)
  
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  
  const formatNumber = n => n.toString().padStart(2, '0')
  
  return `${year}-${formatNumber(month)}-${formatNumber(day)} ${formatNumber(hour)}:${formatNumber(minute)}`
} 