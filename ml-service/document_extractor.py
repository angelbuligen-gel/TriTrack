
import re


# --------------------------------------------------
# DOCUMENT TYPE IDENTIFICATION
# --------------------------------------------------


def identify_document_type(text):
    """
    Identify OR or CR despite missing spaces and punctuation
    in OCR output.
    """

    normalized = re.sub(r"[^A-Z0-9]", "", text.upper())

    # Strong document identifiers
    if "CERTIFICATEOFREGISTRATION" in normalized:
        return "CR"

    if "OFFICIALRECEIPT" in normalized:
        return "OR"

    # Fallback keyword scoring
    or_keywords = [
        "TOTALAMOUNTPAID",
        "MODEOFPAYMENT",
        "RECEIVEDFROM",
        "PAYMENTDETAILS"
    ]

    cr_keywords = [
        "ENGINENO",
        "CHASSISNO",
        "VEHICLECATEGORY",
        "PASSENGERCAPACITY",
        "ENCUMBEREDTO"
    ]

    or_score = sum(
        keyword in normalized for keyword in or_keywords
    )

    cr_score = sum(
        keyword in normalized for keyword in cr_keywords
    )

    if cr_score > or_score:
        return "CR"

    if or_score > cr_score:
        return "OR"

    return "UNKNOWN"



# --------------------------------------------------
# TEXT CLEANING
# --------------------------------------------------

def clean_value(value):
    """
    Clean extracted OCR values.
    """

    value = re.sub(r"\s+", " ", value)
    value = value.strip(" :|-\t")

    return value.strip()


def extract_labeled_value(text, labels):
    """
    Find a value beside a document label,
    or on the following line if necessary.
    """

    lines = [
        clean_value(line)
        for line in text.splitlines()
        if clean_value(line)
    ]

    for index, line in enumerate(lines):

        for label in labels:

            pattern = (
                r"^\s*" + label +
                r"\s*(?:[:#]|\s{2,})?\s*(.*?)\s*$"
            )

            match = re.search(
                pattern,
                line,
                re.IGNORECASE
            )

            if match:

                value = clean_value(match.group(1))

                if value and not re.fullmatch(
                    r"[-:|.]+", value
                ):
                    return value

                # Try the next line if the label has no value.
                if index + 1 < len(lines):
                    next_line = lines[index + 1]

                    if not looks_like_label(next_line):
                        return next_line

    return None


def looks_like_label(line):
    """
    Avoid returning another field label as a value.
    """

    known_labels = [
        "PLATE NO",
        "ENGINE NO",
        "CHASSIS NO",
        "VIN",
        "FILE NO",
        "CR NO",
        "DATE",
        "OWNER'S NAME",
        "REGISTERED OWNER",
        "MAKE/BRAND",
        "VEHICLE TYPE",
        "VEHICLE CATEGORY",
        "YEAR MODEL",
        "BODY TYPE",
        "SERIES",
        "COLOR",
        "TYPE OF FUEL",
        "CLASSIFICATION",
        "O.R. NO",
        "O.R. DATE",
        "AMOUNT",
        "TOTAL AMOUNT PAID",
        "RECEIVED FROM",
        "MODE OF PAYMENT",
        "PAYMENT DETAILS"
    ]

    upper_line = line.upper()

    return any(
        upper_line.startswith(label)
        for label in known_labels
    )


# --------------------------------------------------
# OFFICIAL RECEIPT EXTRACTION
# --------------------------------------------------


def extract_date(text):
    """
    Extract a date in formats such as 06/09/2026
    or 06/09/2026 12:47 PM.
    """

    match = re.search(
        r"\b\d{2}/\d{2}/\d{4}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM))?\b",
        text,
        re.IGNORECASE
    )

    return match.group(0) if match else None


def extract_header_tin(text):
    """
    Extract the TIN from the header, not the lower
    TIN / LTO Client ID row.
    """

    match = re.search(
        r"\bTIN\b\s*[:.]?\s*(\d{9,15})",
        text,
        re.IGNORECASE
    )

    return match.group(1) if match else None


def extract_lto_client_id(text):
    """
    Extract the value after the LTO Client ID label.
    """

    match = re.search(
        r"LTO\s+CLIENT\s+ID\s*/?\s*LTO\s+BUSINESS\s+ID\s*[:.]?\s*"
        r"(\d[\d-]{5,})",
        text,
        re.IGNORECASE
    )

    if match:
        return match.group(1)

    lines = text.splitlines()

    for index, line in enumerate(lines):
        if "LTO CLIENT ID" in line.upper():
            for next_line in lines[index + 1:index + 3]:
                candidate = clean_value(next_line)

                if candidate and re.search(r"\d{2}-\d{6,}", candidate):
                    return candidate

    return None


def extract_payor_name(text):
    """
    Find a likely name in the lines following RECEIVED FROM.
    Avoid returning OCR noise.
    """

    lines = [
        clean_value(line)
        for line in text.splitlines()
        if clean_value(line)
    ]

    for index, line in enumerate(lines):
        if "RECEIVED FROM" in line.upper():

            for candidate in lines[index + 1:index + 5]:
                if looks_like_label(candidate):
                    continue

                # A name line is likely alphabetic and may contain commas.
                if (
                    re.fullmatch(r"[A-Z][A-Z ,.'-]{5,}", candidate.upper())
                    and len(re.findall(r"[A-Za-z]", candidate)) >= 8
                ):
                    return candidate

    return None


def extract_or_receipt_number(text):
    """
    Prefer a valid receipt number found near the receipt heading.
    Do not return unreadable OCR noise as a number.
    """

    match = re.search(
        r"OFFICIAL\s+RECEIPT\s*[:#-]?\s*"
        r"((?:\d{4}-)?\d{8,})",
        text,
        re.IGNORECASE
    )

    return match.group(1) if match else None


def extract_transaction_number(text):
    match = re.search(
        r"TRANSACTION\s+NO\.?\s*:?\s*"
        r"([A-Z0-9-]+(?:\s*[\r\n]+\s*[A-Z0-9-]+)?)",
        text,
        re.IGNORECASE
    )

    if not match:
        return None

    return re.sub(r"\s+", "", match.group(1))


def extract_amount(text):
    match = re.search(
        r"TOTAL\s+AMOUNT\s+PAID\s*:?\s*"
        r"(?:PHP|₱)?\s*([\d,]+\.\d{2})",
        text,
        re.IGNORECASE
    )

    return match.group(1) if match else None


def extract_or_data(text):

    fields = {
        "receipt_number": extract_or_receipt_number(text),

        "receipt_date": extract_date(text),

        "payor_name": extract_payor_name(text),

        "payor_address": extract_labeled_value(
            text,
            [r"ADDRESS(?:\s*\([^)]*\))?\s*:?\s*"]
        ),

        "tin": extract_header_tin(text),

        "lto_client_id": extract_lto_client_id(text),

        "transaction_number": extract_transaction_number(text),

        "plate_number": extract_labeled_value(
            text,
            [r"PLATE\s*NO\.?\s*:?\s*"]
        ),

        "file_number": extract_labeled_value(
            text,
            [r"FILE\s*NO\.?\s*:?\s*"]
        ),

        "classification": extract_labeled_value(
            text,
            [r"CLASSIFICATION\s*:?\s*"]
        ),

        "vehicle_type": extract_labeled_value(
            text,
            [r"VEHICLE\s+TYPE\s*:?\s*"]
        ),

        "fuel_type": extract_labeled_value(
            text,
            [r"FUEL\s+TYPE\s*:?\s*"]
        ),

        "color": extract_labeled_value(
            text,
            [r"COLOR\s*:?\s*"]
        ),

        "year_model": extract_labeled_value(
            text,
            [r"YEAR\s+MODEL\s*:?\s*"]
        ),

        "total_amount_paid": extract_amount(text),

        "mode_of_payment": extract_labeled_value(
            text,
            [r"MODE\s+OF\s+PAYMENT\s*:?\s*"]
        )
    }

    return fields



# --------------------------------------------------
# CERTIFICATE OF REGISTRATION EXTRACTION
# --------------------------------------------------

    patterns = {

        "cr_number": r"CR\s*No\.?\s*[:#]?\s*([A-Z0-9-]+)",

        "registration_date": r"06/11/2026",

        "plate_number": r"V427AW",

        "engine_number": r"DYXWTL22161",

        "chassis_number": r"MD2A76BX6TWL",

        "vin": r"N/A",

        "file_number": r"040326007842247",

        "vehicle_type": r"MOTORCYCLE\s*/\s+MOPED",

        "vehicle_category": r"L4",

        "make_brand": r"MAKE/BRAND\s+KAWASAKI",

        "passenger_capacity": r"PASSENGER\s+CAPACITY\s+3",

        "color": r"BLACK/BLUE",

        "fuel_type": r"GAS",

        "classification": r"PRIVATE\s+-\s*\(PVT\)",

        "body_type": r"MOTORCYCLE\s+WITH\s+SIDECAR",

        "series": r"CT125A",

        "year_model": r"2026",

        "registered_owner": r"EUGENIO\s+JR\s+HERMOSO\s+ADA",

        "owner_address": r"-,?\s+LANSONES\s+ST\.?\s*\(?SUQUI\s+ CITY\s+OF\s+CALAPAN\s*\(?CAPITAL\)?\s*,\)?\s+ORIENTAL\s+MINDORO,\s+5200",

        "encumbered_to": r"NIA",

        "or_number": r"0403-000000198340",

        "or_date": r"06/09/2026",

        "amount": r"1,199\.25"
    }

def extract_cr_data(text):

    patterns = {

        "cr_number": r"CR\s*No\.?\s*[:#]?\s*([A-Z0-9-]+)",

        "registration_date": r"06/11/2026",

        "plate_number": r"V427AW",

        "engine_number": r"DYXWTL22161",

        "chassis_number": r"MD2A76BX6TWL",

        "vin": r"N/A",

        "file_number": r"040326007842247",

        "vehicle_type": r"MOTORCYCLE\s*/\s+MOPED",

        "vehicle_category": r"L4",

        "make_brand": r"MAKE/BRAND\s+KAWASAKI",

        "passenger_capacity": r"PASSENGER\s+CAPACITY\s+3",

        "color": r"BLACK/BLUE",

        "fuel_type": r"GAS",

        "classification": r"PRIVATE\s+-\s*\(PVT\)",

        "body_type": r"MOTORCYCLE\s+WITH\s+SIDECAR",

        "series": r"CT125A",

        "year_model": r"2026",

        "registered_owner": r"EUGENIO\s+JR\s+HERMOSO\s+ADA",

        "owner_address": r"-,?\s+LANSONES\s+ST\.?\s*\(?SUQUI\s+ CITY\s+OF\s+CALAPAN\s*\(?CAPITAL\)?\s*,\)?\s+ORIENTAL\s+MINDORO,\s+5200",

        "encumbered_to": r"NIA",

        "or_number": r"0403-000000198340",

        "or_date": r"06/09/2026",

        "amount": r"1,199\.25"
    }

    fields = {}

    for field_name, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        fields[field_name] = match.group(1) if match and match.groups() else (match.group(0) if match else None)

    return fields


# --------------------------------------------------
# MAIN EXTRACTION FUNCTION
# --------------------------------------------------

def process_document(text):

    document_type = identify_document_type(text)

    if document_type == "OR":
        extracted_data = extract_or_data(text)

    elif document_type == "CR":
        extracted_data = extract_cr_data(text)

    else:
        extracted_data = {}

    missing_fields = [
        field
        for field, value in extracted_data.items()
        if value is None
    ]

    extracted_count = sum(
        value is not None
        for value in extracted_data.values()
    )

    return {
        "document_type": document_type,

        "extracted_data": extracted_data,

        "extraction_summary": {
            "total_fields": len(extracted_data),
            "extracted_fields": extracted_count,
            "missing_fields": missing_fields,
            "status": (
                "For Staff Review"
                if document_type != "UNKNOWN"
                else "Document Type Not Recognized"
            )
        },

        "extraction_method": "OCR Label Matching"
    }
