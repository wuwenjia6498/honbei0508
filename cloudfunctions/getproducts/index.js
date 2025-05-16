// 云函数入口文件
const cloud = require('wx-server-sdk')

// 初始化云环境，确保使用正确环境ID
try {
  cloud.init({
    env: 'cloud1-3g9nsaj9f3a1b0ed'
  })
  console.log('使用固定环境ID初始化成功')
} catch (err) {
  console.error('固定环境ID初始化失败，尝试使用默认环境', err)
  cloud.init()
}

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  console.log('getproducts云函数被调用，参数:', event)
  
  const { 
    productId = null,
    categoryId = null,
    categoryName = null,
    pageSize = 10,
    pageNum = 1,
    keyword = '',
    sortBy = 'createTime',
    sortOrder = 'desc',
    onlyActive = true,
    isFeatured = null,
    isHot = null,
    isNew = null
  } = event
  
  try {
    // 如果指定了商品ID，则返回单个商品详情
    if (productId) {
      const product = await db.collection('products').doc(productId).get()
      console.log('获取单个商品详情:', product.data)
      return {
        success: true,
        data: product.data
      }
    }
    
    // 构建查询条件
    const condition = {}
    
    // 只显示启用的商品
    if (onlyActive) {
      condition.isActive = true
    }
    
    // 按分类ID筛选
    if (categoryId) {
      condition.categoryId = categoryId
    }
    
    // 按分类名称筛选
    if (categoryName) {
      condition.category = categoryName
    }
    
    // 按特色商品筛选
    if (isFeatured !== null) {
      condition.isFeatured = isFeatured
    }
    
    // 按热门商品筛选
    if (isHot !== null) {
      condition.isHot = isHot
    }
    
    // 按新品筛选
    if (isNew !== null) {
      condition.isNew = isNew
    }
    
    // 按关键词搜索
    if (keyword && keyword.trim() !== '') {
      // 在名称或描述中搜索关键词
      condition.name = db.RegExp({
        regexp: keyword,
        options: 'i', // 不区分大小写
      })
    }
    
    console.log('查询条件:', condition)
    
    // 计算总数
    const countResult = await db.collection('products')
      .where(condition)
      .count()
    
    const total = countResult.total
    console.log('符合条件的商品总数:', total)
    
    // 获取分页数据
    const list = await db.collection('products')
      .where(condition)
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .orderBy(sortBy, sortOrder)
      .get()
    
    console.log('获取到的商品数据:', list.data.length, '条记录')
    
    // 如果没有找到数据，尝试放宽条件查询
    if (list.data.length === 0) {
      console.log('未找到商品数据，尝试放宽查询条件')
      const basicList = await db.collection('products').limit(pageSize).get()
      console.log('基本查询结果:', basicList.data.length, '条记录')
      
      return {
        success: true,
        data: basicList.data,
        note: '使用放宽条件的查询结果',
        pagination: {
          total: basicList.data.length,
          pageSize,
          pageNum: 1,
          pages: 1
        },
        debug: {
          originalCondition: condition,
          originalTotal: total
        }
      }
    }
    
    return {
      success: true,
      data: list.data,
      pagination: {
        total,
        pageSize,
        pageNum,
        pages: Math.ceil(total / pageSize)
      }
    }
  } catch (error) {
    console.error('获取商品数据失败', error)
    return {
      success: false,
      message: '获取商品数据失败: ' + error.message,
      error: error.toString(),
      stack: error.stack
    }
  }
} 