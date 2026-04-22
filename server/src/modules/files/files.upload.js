import multer from "multer";
import env from "../../config/env.js";
import AppError from "../../core/errors/AppError.js";
import { ALLOWED_MIME_TYPES } from "./files.constants.js";
import { assertSafeUpload } from "./fileSecurity.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.FILE_UPLOAD_MAX_BYTES,
    files: 1,
    fields: 5,
    fieldSize: 10000
  },
  fileFilter: (request, file, callback) => {
    void request;

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new AppError("Unsupported file type", {
          statusCode: 422,
          code: "UNSUPPORTED_FILE_TYPE",
          details: [
            {
              path: "file",
              message: `Allowed mime types: ${ALLOWED_MIME_TYPES.join(", ")}`
            }
          ]
        })
      );
    }

    return callback(null, true);
  }
});

function uploadSingleFile(request, response, next) {
  upload.single("file")(request, response, (error) => {
    if (!error) {
      try {
        assertSafeUpload(request.file, { codePrefix: "FILE" });
        return next();
      } catch (validationError) {
        return next(validationError);
      }
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return next(
        new AppError("File is too large", {
          statusCode: 413,
          code: "FILE_TOO_LARGE",
          details: [
            {
              path: "file",
              message: `Maximum upload size is ${env.FILE_UPLOAD_MAX_BYTES} bytes`
            }
          ]
        })
      );
    }

    if (error instanceof multer.MulterError) {
      return next(
        new AppError("Invalid multipart upload", {
          statusCode: 422,
          code: "INVALID_MULTIPART_UPLOAD",
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

export default uploadSingleFile;
