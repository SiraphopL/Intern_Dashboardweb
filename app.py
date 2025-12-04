from flask import Flask, render_template, jsonify, request
import requests

app = Flask(__name__)


# ---------- หน้าเว็บหลัก ----------
@app.route("/")
def home():
    return render_template("ByChatGPT.html")


# ---------- API ฝนจริง /rain_forecast_by_areacode ----------
@app.route("/api/rain_forecast")
def api_rain_forecast():
    """
    proxy ไปยัง API จริง:
    https://rice-planting-dot-thagri-portal-staging.as.r.appspot.com/rain_forecast_by_areacode/<area_code>
    โดยส่ง JSON body เหมือนที่ลองใน Postman
    """
    area_code = request.args.get("area_code", "930606")

    # ถ้าไม่ส่ง date / rice_variety / planting_method มาจากหน้าเว็บ
    # จะใช้ค่า default แบบเดียวกับที่ลองใน Postman
    date = request.args.get("date", "01-06-2025")
    rice_variety = request.args.get("rice_variety", "ข้าวกลาง")
    planting_method = request.args.get("planting_method", "หว่านน้ำตม")

    external_url = (
        "https://rice-planting-dot-thagri-portal-staging.as.r.appspot.com/"
        f"rain_forecast_by_areacode/{area_code}"
    )

    payload = {
        "area_code": area_code,
        "date": date,
        "rice_variety": rice_variety,
        "planting_method": planting_method,
    }

    try:
        # ใช้ json=payload → เทียบเท่ากับใน Postman ที่ส่ง body เป็น JSON
        r = requests.post(external_url, json=payload, timeout=30)

        print(">>>> rain_forecast status:", r.status_code)
        print(">>>> rain_forecast body:", r.text[:500])

        r.raise_for_status()  # ถ้าไม่ใช่ 2xx ให้เด้งไปเข้า except

        # พยายาม parse JSON
        try:
            data = r.json()
        except ValueError:
            # ถ้า parse ไม่ได้ ส่ง text ตรง ๆ กลับไปให้ debug
            return r.text, r.status_code, {
                "Content-Type": r.headers.get("Content-Type", "text/plain")
            }

        # ส่ง JSON ที่ได้ต่อไปยัง frontend
        return jsonify(data), 200

    except requests.Timeout as e:
        print(">>>> rain_forecast TIMEOUT:", str(e))
        return jsonify({"error": "timeout", "detail": str(e)}), 504

    except requests.RequestException as e:
        print(">>>> rain_forecast RequestException:", str(e))
        return jsonify({"error": "request_failed", "detail": str(e)}), 502




# ---------- API ปฏิทินลดผลผลิต ----------
@app.route("/api/yield_reduction")
def yield_reduction():
    area_code = request.args.get("area_code", "930606")
    month_year = request.args.get("month_year", "09-2025")
    rice_variety = request.args.get("rice_variety", "ข้าวกลาง")
    planting_method = request.args.get("planting_method", "หว่านน้ำตม")

    payload = {
        "area_code": area_code,
        "month_year": month_year,
        "rice_variety": rice_variety,
        "planting_method": planting_method
    }

    url = "https://rice-planting-dot-thagri-portal-staging.as.r.appspot.com/yield_reduction_calendar"

    try:
        r = requests.post(url, json=payload, timeout=10)
        r.raise_for_status()
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 500

    data = r.json()
    return jsonify(data)


# ---------- API รายชื่อ ตำบล ----------
@app.route("/api/subdistricts")
def api_subdistricts():
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


# ---------- API planting_scenario ----------
@app.route("/api/planting_scenario")
def api_planting_scenario():
    area_code = request.args.get("area_code", "930606")
    rice_variety = request.args.get("rice_variety", "ข้าวกลาง")
    planting_method = request.args.get("planting_method", "หว่านน้ำตม")
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


# ---------- API crop_calendar ----------
@app.route("/api/crop_calendar")
def api_crop_calendar():
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
    # รันใน debug mode ให้ auto-reload เวลาแก้ไฟล์
    app.run(debug=True)
