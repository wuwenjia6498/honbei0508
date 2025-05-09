// 这是一个占位文件，解决微信开发者工具编译错误
// 此云函数已在项目清理中被标记为废弃，但保留此文件以防止编译错误
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 占位函数，返回废弃提示
exports.main = async (event, context) => {
  return {
    success: false,
    message: '此云函数已不再使用，请使用userManager的搜索功能'
  }
} 