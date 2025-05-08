// 云函数入口文件
const cloud = require('wx-server-sdk')

// 直接指定环境ID
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
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
    
    // 计算总数
    const countResult = await db.collection('products')
      .where(condition)
      .count()
    
    const total = countResult.total
    
    // 获取分页数据
    const list = await db.collection('products')
      .where(condition)
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .orderBy(sortBy, sortOrder)
      .get()
    
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
      message: '获取商品数据失败',
      error
    }
  }
} 