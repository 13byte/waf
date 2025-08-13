# GeoIP service for IP geolocation
import os
import geoip2.database
import geoip2.errors
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class GeoIPService:
    def __init__(self):
        self.db_path = "/app/data/geoip"
        self.config_file = "/app/data/geoip/config.txt"
        self.reader = None
        self._load_database()
    
    def _load_database(self):
        """Load the GeoIP database"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    config_data = f.read().strip().split('\n')
                    if len(config_data) >= 1:
                        filename = config_data[0]
                        db_file_path = os.path.join(self.db_path, filename)
                        
                        if os.path.exists(db_file_path):
                            self.reader = geoip2.database.Reader(db_file_path)
                            logger.info(f"GeoIP database loaded: {filename}")
                            return
            
            logger.info("No GeoIP database configured, using fallback classification")
        except Exception as e:
            logger.error(f"Failed to load GeoIP database: {e}")
            self.reader = None
    
    def reload_database(self):
        """Reload the GeoIP database after upload"""
        if self.reader:
            self.reader.close()
            self.reader = None
        self._load_database()
    
    def get_country_info(self, ip_address: str) -> Dict[str, Any]:
        """Get country information for an IP address"""
        try:
            # Try MaxMind GeoIP database first
            if self.reader:
                try:
                    response = self.reader.country(ip_address)
                    return {
                        "country": response.country.name or "Unknown",
                        "country_code": response.country.iso_code or "XX",
                        "source": "geoip_database",
                        "success": True
                    }
                except geoip2.errors.AddressNotFoundError:
                    logger.debug(f"IP {ip_address} not found in GeoIP database")
                except Exception as e:
                    logger.error(f"GeoIP lookup error for {ip_address}: {e}")
            
            # Fallback to basic IP range classification
            return self._get_fallback_country(ip_address)
            
        except Exception as e:
            logger.error(f"Failed to get country info for {ip_address}: {e}")
            return {
                "country": "Unknown",
                "country_code": "XX", 
                "source": "error",
                "success": False
            }
    
    def get_city_info(self, ip_address: str) -> Dict[str, Any]:
        """Get city information for an IP address (if database supports it)"""
        try:
            if self.reader:
                try:
                    # Try to get city info - will work with City database
                    response = self.reader.city(ip_address)
                    return {
                        "country": response.country.name or "Unknown",
                        "country_code": response.country.iso_code or "XX",
                        "city": response.city.name or "Unknown",
                        "subdivision": response.subdivisions.most_specific.name or "Unknown",
                        "postal_code": response.postal.code or "Unknown",
                        "latitude": float(response.location.latitude) if response.location.latitude else None,
                        "longitude": float(response.location.longitude) if response.location.longitude else None,
                        "source": "geoip_city_database",
                        "success": True
                    }
                except geoip2.errors.AddressNotFoundError:
                    logger.debug(f"IP {ip_address} not found in GeoIP city database")
                except Exception as e:
                    # Fallback to country lookup
                    return self.get_country_info(ip_address)
            
            # Fallback to basic classification
            return self._get_fallback_country(ip_address)
            
        except Exception as e:
            logger.error(f"Failed to get city info for {ip_address}: {e}")
            return self.get_country_info(ip_address)
    
    def _get_fallback_country(self, ip_address: str) -> Dict[str, Any]:
        """Basic IP range classification fallback"""
        try:
            # Private/Local network detection
            if (ip_address.startswith('192.168.') or 
                ip_address.startswith('10.') or 
                ip_address.startswith('172.16.') or
                ip_address.startswith('127.')):
                return {
                    "country": "Local Network",
                    "country_code": "LN",
                    "source": "fallback_private",
                    "success": True
                }
            
            # Very basic public IP classification based on common ranges
            ip_ranges = {
                # Asia Pacific
                ('1.', '14.', '27.', '36.', '39.', '42.', '49.', '58.', '59.', '60.', '61.'): {
                    "country": "China", "code": "CN"
                },
                ('103.', '110.', '111.', '112.', '113.', '114.', '115.', '116.', '117.', '118.', '119.', '120.', '121.', '122.', '123.'): {
                    "country": "China", "code": "CN"
                },
                # Russia
                ('5.', '31.', '46.', '77.', '78.', '79.', '80.', '81.', '82.', '83.', '84.', '85.'): {
                    "country": "Russia", "code": "RU"
                },
                # United States
                ('3.', '4.', '6.', '7.', '8.', '9.', '11.', '13.', '15.', '16.', '17.', '18.', '19.', '20.'): {
                    "country": "United States", "code": "US"
                },
                ('23.', '24.', '34.', '35.', '40.', '44.', '50.', '52.', '54.', '63.', '64.', '65.', '66.'): {
                    "country": "United States", "code": "US"
                },
                # Europe
                ('87.', '88.', '89.', '90.', '91.', '92.', '93.', '94.', '95.'): {
                    "country": "Germany", "code": "DE"
                }
            }
            
            # Check each range
            for prefixes, country_info in ip_ranges.items():
                if any(ip_address.startswith(prefix) for prefix in prefixes):
                    return {
                        "country": country_info["country"],
                        "country_code": country_info["code"],
                        "source": "fallback_range",
                        "success": True
                    }
            
            # Default for unmatched IPs
            return {
                "country": "Other",
                "country_code": "OT", 
                "source": "fallback_default",
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Fallback country classification failed for {ip_address}: {e}")
            return {
                "country": "Unknown",
                "country_code": "XX",
                "source": "fallback_error", 
                "success": False
            }
    
    def is_database_available(self) -> bool:
        """Check if GeoIP database is loaded"""
        return self.reader is not None
    
    def get_database_info(self) -> Dict[str, Any]:
        """Get information about the loaded database"""
        try:
            if not self.reader:
                return {
                    "available": False,
                    "type": "fallback_only"
                }
            
            metadata = self.reader.metadata()
            return {
                "available": True,
                "type": "maxmind_geoip",
                "database_type": metadata.database_type,
                "build_date": metadata.build_epoch,
                "description": getattr(metadata, 'description', {}).get('en', 'Unknown')
            }
        except Exception as e:
            logger.error(f"Failed to get database info: {e}")
            return {
                "available": False,
                "type": "error",
                "error": str(e)
            }

# Global instance
geoip_service = GeoIPService()