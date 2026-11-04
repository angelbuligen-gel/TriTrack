
from fastapi import FastAPI, UploadFile, File, HTTPException
from document_extractor import process_document

from PIL import Image, ImageOps
import pytesseract
import cv2
import numpy as np
import fitz
import io


# ==================================================
# FASTAPI APPLICATION
# ==================================================

app = FastAPI(
    title="TrikeTrack ML Service",
    description="Intelligent Document Data Extraction for OR and CR",
    version="1.0.0"
)


# ==================================================
# CONFIGURATION
# ==================================================

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_PDF_PAGES = 10

ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf"
}


# ==================================================
# IMAGE PREPROCESSING
# ==================================================

def preprocess_image(image):
    """
    Prepare document images for better OCR recognition.
    """

    image = ImageOps.exif_transpose(image).convert("RGB")

    image_array = np.array(image)

    gray = cv2.cvtColor(
        image_array,
        cv2.COLOR_RGB2GRAY
    )

    resized = cv2.resize(
        gray,
        None,
        fx=1.5,
        fy=1.5,
        interpolation=cv2.INTER_CUBIC
    )

    processed = cv2.GaussianBlur(
        resized,
        (3, 3),
        0
    )

    processed = cv2.threshold(
        processed,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )[1]

    return processed


# ==================================================
# OCR TEXT EXTRACTION
# ==================================================

def extract_text(image):
    """
    Extract text from a document image using Tesseract.
    """

    processed = preprocess_image(image)

    text = pytesseract.image_to_string(
        processed,
        lang="eng",
        config="--psm 6"
    )

    return text.strip()


# ==================================================
# FILE VALIDATION
# ==================================================

async def read_uploaded_file(file):

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG, and PDF files are accepted."
        )

    content = await file.read(MAX_FILE_SIZE + 1)

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size must not exceed 10 MB."
        )

    return content


# ==================================================
# DOCUMENT OCR PROCESSING
# ==================================================

def process_uploaded_document(content, content_type):
    """
    Process JPG, PNG, or PDF documents
    and return OCR text for every page.
    """

    extracted_pages = []

    if content_type == "application/pdf":

        if not content.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=400,
                detail="Invalid PDF file."
            )

        pdf = fitz.open(
            stream=content,
            filetype="pdf"
        )

        try:

            if len(pdf) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="PDF contains no pages."
                )

            if len(pdf) > MAX_PDF_PAGES:
                raise HTTPException(
                    status_code=400,
                    detail="PDF must not exceed 10 pages."
                )

            for page_number, page in enumerate(pdf):

                pix = page.get_pixmap(
                    matrix=fitz.Matrix(2, 2),
                    alpha=False
                )

                image = Image.open(
                    io.BytesIO(pix.tobytes("png"))
                )

                text = extract_text(image)

                extracted_pages.append({
                    "page": page_number + 1,
                    "text": text
                })

        finally:
            pdf.close()

    else:

        try:

            image = Image.open(
                io.BytesIO(content)
            )

            image.verify()

            image = Image.open(
                io.BytesIO(content)
            )

            text = extract_text(image)

            extracted_pages.append({
                "page": 1,
                "text": text
            })

        except HTTPException:
            raise

        except Exception:
            raise HTTPException(
                status_code=422,
                detail="Invalid or unreadable image file."
            )

    return extracted_pages


# ==================================================
# HOME / HEALTH CHECK
# ==================================================

@app.get("/")
def home():

    return {
        "message": "TrikeTrack ML Service is running",
        "status": "success",
        "version": "1.0.0"
    }


# ==================================================
# ENDPOINT 1: RAW OCR EXTRACTION
# ==================================================

@app.post("/extract-text")
async def extract_text_endpoint(
    file: UploadFile = File(...)
):

    try:

        content = await read_uploaded_file(file)

        extracted_pages = process_uploaded_document(
            content,
            file.content_type
        )

        return {
            "status": "success",
            "filename": file.filename,
            "pages": extracted_pages
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=422,
            detail="Unable to process this document. Please check the file."
        )

    finally:
        await file.close()


# ==================================================
# ENDPOINT 2: INTELLIGENT DOCUMENT DATA EXTRACTION
# ==================================================

@app.post("/extract-document")
async def extract_structured_document(
    file: UploadFile = File(...)
):

    try:

        # STEP 1: Validate and read uploaded document

        content = await read_uploaded_file(file)

        # STEP 2: Perform OCR

        extracted_pages = process_uploaded_document(
            content,
            file.content_type
        )

        # STEP 3: Combine text from all pages

        full_text = "\n".join(
            page["text"]
            for page in extracted_pages
        )

        if not full_text.strip():
            raise HTTPException(
                status_code=422,
                detail="No readable text was detected in the document."
            )

        # STEP 4: Identify document type
        # STEP 5: Extract OR or CR fields

        result = process_document(full_text)

        # STEP 6: Return structured response

        return {
            "status": "success",
            "filename": file.filename,

            "document_type": result["document_type"],

            "extracted_data": result["extracted_data"],

            "extraction_summary": result["extraction_summary"],

            "extraction_method": result["extraction_method"],

            "raw_text": full_text
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=422,
            detail="Unable to extract document information. Please check the uploaded file."
        )

    finally:
        await file.close()
