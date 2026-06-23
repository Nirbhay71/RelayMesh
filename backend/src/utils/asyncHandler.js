const asyncHandler = (functionToHandel)=>{
    return (req,res,next)=>{
        Promise
        .resolve(functionToHandel(req,res,next))
        .catch((err)=>{
            next(err)
        })
    }
}

export {asyncHandler}