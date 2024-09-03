const fs = require("fs").promises; // Use the promise-based fs API
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const colors = require("colors/safe");

const router = express.Router();
router.use(
  bodyParser.json(),
  bodyParser.urlencoded({ extended: true }),
  multer().any()
);

router.use(async (req, res, next) => {
  const uploadPath = req.app.get("uploadPath");
  const logger = req.app.get("logger");

  logger.log(
    [
      `\tquery.pathName : ${req.query.pathName}`,
      `\tbody.pathName  : ${req.body.pathName}`,
      `\tparams.pathName: ${req.params.pathName}`,
    ].join("\n")
  );

  let pathName =
    req.query.pathName || req.body.pathName || req.params.pathName || ".";
  pathName = path.normalize(pathName).replace(/^\/+|\/+$/g, "");
  const currentUploadPath = path.join(uploadPath, pathName);

  try {
    await fs.mkdir(currentUploadPath, { recursive: true });
  } catch (error) {
    const resJSON = {
      status: "failed",
      message: `Can't create the path: ${pathName}`,
    };
    logger.log(resJSON.message);
    return res.status(500).send(resJSON);
  }

  let responseContent = [];

  // Handle file uploads
  let files = req.file ? [req.file] : req.files;
  if (files && files.length > 0) {
    try {
      const fileResults = await Promise.all(
        files.map(async (file) => {
          const fileName = path.join(pathName, file.originalname);
          try {
            await fs.writeFile(path.join(uploadPath, fileName), file.buffer);
            logger.log(colors.green(`Upload to ${fileName} Success`));
            return { name: fileName, type: "file", err: null };
          } catch (err) {
            logger.log(colors.red(`Upload to ${fileName} Failed`));
            return { name: fileName, type: "file", err: err.message };
          }
        })
      );
      responseContent = responseContent.concat(fileResults);
    } catch (error) {
      logger.log(colors.red(`File processing failed: ${error.message}`));
      return res.status(500).send({
        status: "fail",
        message: "An error occurred during file processing.",
      });
    }
  }

  // Handle other form inputs
  Object.entries(req.body).forEach(([key, value]) => {
    responseContent.push({
      key: key,
      value: value,
      type: "text",
      err: null,
    });
  });

  return res.send({
    status: "success",
    message: "Upload Success",
    content: responseContent,
  });
});

module.exports = router;
