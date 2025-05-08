// 这是一个临时占位文件，解决编译错误
// 后续将通过微信开发者工具删除或替换
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 占位函数
exports.main = async (event, context) => {
  return {
    success: false,
    message: '此云函数已不再使用，请使用userManager的搜索功能'
  }
}