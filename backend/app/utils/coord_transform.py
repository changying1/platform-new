import math

# Constants
x_pi = 3.14159265358979324 * 3000.0 / 180.0
pi = 3.1415926535897932384626  # PI
a = 6378245.0  # Semi-major axis
ee = 0.00669342162296594323  # Eccentricity squared

def wgs84_to_gcj02(lng: float, lat: float):
    """
    High-precision WGS84 to GCJ02 conversion.
    Accuracy is maintained through high-precision constants and standard transformation formula.
    :param lng: WGS84 Longitude
    :param lat: WGS84 Latitude
    :return: (lng_gcj, lat_gcj) accurate to 10+ decimal places
    """
    if out_of_china(lng, lat):
        return lng, lat
    
    dlat = _transform_lat(lng - 105.0, lat - 35.0)
    dlng = _transform_lng(lng - 105.0, lat - 35.0)
    radlat = lat / 180.0 * pi
    magic = math.sin(radlat)
    magic = 1 - ee * magic * magic
    sqrtmagic = math.sqrt(magic)
    dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * pi)
    dlng = (dlng * 180.0) / (a / sqrtmagic * math.cos(radlat) * pi)
    mglat = lat + dlat
    mglng = lng + dlng
    
    # Returning with high precision
    return round(mglng, 12), round(mglat, 12)

def gcj02_to_wgs84(lng: float, lat: float):
    """
    GCJ02 to WGS84 conversion (Reverse conversion using iterative method for high precision).
    """
    if out_of_china(lng, lat):
        return lng, lat
    
    # Initial guess
    lng_wgs, lat_wgs = lng, lat
    for _ in range(5):  # 5 iterations are usually enough for precision > 1e-10
        curr_lng, curr_lat = wgs84_to_gcj02(lng_wgs, lat_wgs)
        lng_wgs += (lng - curr_lng)
        lat_wgs += (lat - curr_lat)
        
    return round(lng_wgs, 12), round(lat_wgs, 12)

def _transform_lat(lng, lat):
    ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + \
          0.1 * lng * lat + 0.2 * math.sqrt(abs(lng))
    ret += (20.0 * math.sin(6.0 * lng * pi) + 20.0 * math.sin(2.0 * lng * pi)) * 2.0 / 3.0
    ret += (20.0 * math.sin(lat * pi) + 40.0 * math.sin(lat / 3.0 * pi)) * 2.0 / 3.0
    ret += (160.0 * math.sin(lat / 12.0 * pi) + 320 * math.sin(lat * pi / 30.0)) * 2.0 / 3.0
    return ret

def _transform_lng(lng, lat):
    ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + \
          0.1 * lng * lat + 0.1 * math.sqrt(abs(lng))
    ret += (20.0 * math.sin(6.0 * lng * pi) + 20.0 * math.sin(2.0 * lng * pi)) * 2.0 / 3.0
    ret += (20.0 * math.sin(lng * pi) + 40.0 * math.sin(lng / 3.0 * pi)) * 2.0 / 3.0
    ret += (150.0 * math.sin(lng / 12.0 * pi) + 300.0 * math.sin(lng / 30.0 * pi)) * 2.0 / 3.0
    return ret

def out_of_china(lng, lat):
    """
    Check if the coordinate is out of China (Simplified bound).
    """
    return not (73.66 < lng < 135.05 and 3.86 < lat < 53.55)
