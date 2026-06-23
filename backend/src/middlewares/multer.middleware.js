import multer from "multer"

const storage = multer.diskStorage({
    destination : function (req,res,cb){
        cb(null,"./public/temp")
    },
    filename : function (req,file,cb){
        cb(null,file.originalname)  // should change name of file to prevent override
    }
})

export const upload = multer({storage})