import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
    api_key : process.env.CLOUDINARY_API_KEY,
    api_secret : process.env.CLOUDINARY_API_SECRET
})

const uploadFileOnCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath){
            console.log("The provided file path does not exists");
            return null;
        }
        const responce = await cloudinary.uploader.upload(localFilePath , {
            resource_type : "auto"
        })
        console.log("File uploaded successfully on url : ",responce.url);
        fs.unlinkSync(localFilePath);
        return responce;
    } catch (error) {
        console.log("Error on uploading file : ",error);
        fs.unlinkSync(localFilePath);
        return null;
    }
}

const deleteFileFromCloudinary = async (imageUrl) => {
    try {
        if (!imageUrl) return null;
        
        // Extract public_id from the image URL
        const matches = imageUrl.match(/\/upload\/(?:v\d+\/)?([^.]+)/);
        const publicId = matches ? matches[1] : null;

        if (!publicId) return null;

        const response = await cloudinary.uploader.destroy(publicId);
        console.log("File deleted successfully from Cloudinary, response: ", response);
        return response;
    } catch (error) {
        console.log("Error on deleting file from Cloudinary: ", error);
        return null;
    }
}

export { uploadFileOnCloudinary, deleteFileFromCloudinary }