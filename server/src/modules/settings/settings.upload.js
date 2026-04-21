import multer from "multer";
import AppError from "../../core/errors/AppError.js";
import {
  SETTINGS_LOGO_ALLOWED_MIME_TYPES,
  SETTINGS_LOGO_MAX_BYTES
} from "./settings.constants.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: SETTINGS_LOGO_MAX_BYTES,
    files: 1,
    fields: 2,
    fieldSize: 2000
  },
  fileFilter: (request, file, callback) => {
    void request;

    if (!SETTINGS_LOGO_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new AppError("Unsupported logo file type", {
          statusCode: 422,
          code: "UNSUPPORTED_LOGO_FILE_TYPE",
          details: [
            {
              path: "file",
              message: `Allowed mime types: ${SETTINGS_LOGO_ALLOWED_MIME_TYPES.join(", ")}`
            }
          ]
        })
      );
    }

    return callback(null, true);
  }
});

function uploadSettingsLogo(request, response, next) {
  upload.single("file")(request, response, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return next(
        new AppError("Logo file is too large", {
          statusCode: 413,
          code: "LOGO_FILE_TOO_LARGE",
          details: [
            {
              path: "file",
              message: `Maximum upload size is ${SETTINGS_LOGO_MAX_BYTES} bytes`
            }
          ]
        })
      );
    }

    if (error instanceof multer.MulterError) {
      return next(
        new AppError("Invalid multipart logo upload", {
          statusCode: 422,
          code: "INVALID_MULTIPART_LOGO_UPLOAD",
          details: [
            {
              path: "file",
              message: error.message
            }
          ]
        })
      );
    }

    return next(error);
  });
}

export default uploadSettingsLogo;
