// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  if (!openid) {
    return {
      isAdmin: false,
      message: '获取用户信息失败'
    }
  }
  
  try {
    // 查询config集合中的管理员配置
    const configData = await db.collection('config').doc('adminConfig').get()
    
    if (!configData.data || !configData.data.adminOpenids) {
      return {
        isAdmin: false,
        message: '未找到管理员配置'
      }
    }
    
    // 检查当前用户是否在管理员名单中
    const isAdmin = configData.data.adminOpenids.includes(openid)
    
    return {
      isAdmin,
      message: isAdmin ? '用户是管理员' : '用户不是管理员'
    }
  } catch (error) {
    console.error('检查管理员权限失败', error)
    return {
      isAdmin: false,
      message: '检查管理员权限失败',
      error: error.message
    }
  }
} 