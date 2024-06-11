

// const wrapper = (fn) => (req,res,next) => {
//   Promise.resolve(fn(req, res, next))
//     .catch((err) => { next(err) })
// }

const wrapper = (fn) =>async (req,res,next) => {
  try {
    await fn(req, res, next)
  } catch (error) {
    res.status(err.code || 800).json({
      success: false,
      message: err.message
    })
    next(err) 
  }
}
export {wrapper}