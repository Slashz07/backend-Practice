

// const wrapper = (fn) => (req,res,next) => {
//   Promise.resolve(fn(req, res, next))
//     .catch((err) => { next(err) })
// }

const wrapper = (fn) =>async (req,res,next) => {
  try {
    await fn(req, res, next)
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    })
  }
}
export {wrapper}