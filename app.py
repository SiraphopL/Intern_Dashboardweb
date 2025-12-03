from flask import Flask, render_template, jsonify, request
import requests
import json

app = Flask(__name__)

@app.route("/")
def home():
    # เรนเดอร์หน้า ByChatGPT.html (อยู่ใน templates)
    return render_template("ByChatGPT.html")


# ---------- API ภายในของเรา ไว้ให้ frontend เรียก ----------

@app.route("/api/yield_reduction")
def yield_reduction():
    payload = {
        "area_code": "930606",
        "month_year": "09-2025",
        "rice_variety": "ข้าวกลาง",
        "planting_method": "หว่านน้ำตม"
    }

    url = "https://rice-planting-dot-thagri-portal-staging.as.r.appspot.com/yield_reduction_calendar"

    try:
        r = requests.post(url, json=payload, timeout=10)
        r.raise_for_status()
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 500

    data = r.json()
    return jsonify(data)


@app.route("/api/subdistricts")
def api_subdistricts():
    """
    proxy ไปยัง API จริงของ thagri:
    /subdistricts?province_name=...
    """
    province_name = request.args.get("province_name")
    if not province_name:
        return jsonify({"error": "province_name is required"}), 400

    external_url = (
        "https://rice-planting-dot-thagri-portal-staging.as.r.appspot.com/subdistricts"
    )

    try:
        r = requests.get(
            external_url,
            params={"province_name": province_name},
            timeout=10,
        )
        r.raise_for_status()
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 500

    return jsonify(r.json())


# ---------- NEW: proxy ไปยัง /planting_scenario ----------

@app.route("/api/planting_scenario")
def api_planting_scenario():
    """
    proxy เรียก API planting_scenario

    frontend ส่ง area_code (และอาจส่ง date, rice_variety, planting_method มาเพิ่มเติมได้)
    """
    area_code = request.args.get("area_code", "930606")
    rice_variety = request.args.get("rice_variety", "ข้าวกลาง")
    planting_method = request.args.get("planting_method", "หว่านน้ำตม")

    # API จริงต้องการ field "date" ไม่ใช่ date_start/date_end
    # ตอนนี้ถ้า frontend ไม่ส่งอะไรมาก็ใช้ default ไปก่อน
    date = request.args.get("date", "11-06-2025")

    external_url = (
        "https://rice-planting-dot-thagri-portal-staging.as.r.appspot.com/planting_scenario"
    )

    payload = {
        "area_code": area_code,
        "date": date,
        "rice_variety": rice_variety,
        "planting_method": planting_method,
    }

    try:
        r = requests.post(external_url, json=payload, timeout=10)

        # DEBUG: ดู status + body จาก API จริง
        print(">>>> planting_scenario status:", r.status_code)
        print(">>>> planting_scenario body:", r.text[:500])

        r.raise_for_status()
        data = r.json()
        return jsonify(data)

    except requests.HTTPError as e:
        resp = e.response
        status = resp.status_code if resp is not None else 500
        body = resp.text[:500] if resp is not None else ""
        print(">>>> planting_scenario HTTPError:", status, body)
        return jsonify({
            "error": "upstream_error",
            "status": status,
            "body": body,
            "payload_sent": payload
        }), status

    except requests.RequestException as e:
        print(">>>> planting_scenario RequestException:", str(e))
        return jsonify({"error": "request_failed", "detail": str(e)}), 500
    
# ---------- API Crop calendar ----------

@app.route("/api/crop_calendar")
def api_crop_calendar():
    """
    proxy เรียก API crop_calendar

    frontend จะส่ง area_code (และอาจส่ง rice_variety, planting_method ในอนาคต)
    """
    area_code = request.args.get("area_code", "930606")
    rice_variety = request.args.get("rice_variety", "ข้าวกลาง")
    planting_method = request.args.get("planting_method", "หว่านน้ำตม")

    external_url = (
        "https://rice-planting-dot-thagri-portal-staging.as.r.appspot.com/crop_calendar"
    )

    payload = {
        "area_code": area_code,
        "rice_variety": rice_variety,
        "planting_method": planting_method,
    }

    try:
        r = requests.post(external_url, json=payload, timeout=10)

        # DEBUG ดู status+body จาก API จริง
        print(">>>> crop_calendar status:", r.status_code)
        print(">>>> crop_calendar body:", r.text[:500])

        r.raise_for_status()
        data = r.json()
        return jsonify(data)

    except requests.HTTPError as e:
        resp = e.response
        status = resp.status_code if resp is not None else 500
        body = resp.text[:500] if resp is not None else ""
        print(">>>> crop_calendar HTTPError:", status, body)
        return jsonify({
            "error": "upstream_error",
            "status": status,
            "body": body,
            "payload_sent": payload
        }), status

    except requests.RequestException as e:
        print(">>>> crop_calendar RequestException:", str(e))
        return jsonify({"error": "request_failed", "detail": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
