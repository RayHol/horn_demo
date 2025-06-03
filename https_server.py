import http.server
import ssl
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

def generate_self_signed_cert():
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization
    import datetime

    # Generate key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )

    # Generate certificate
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, u"localhost")
    ])

    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        private_key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.datetime.utcnow()
    ).not_valid_after(
        datetime.datetime.utcnow() + datetime.timedelta(days=365)
    ).sign(private_key, hashes.SHA256())

    # Write certificate
    with open("cert.pem", "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))

    # Write private key
    with open("key.pem", "wb") as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ))

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        SimpleHTTPRequestHandler.end_headers(self)

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

def run_server():
    # Generate certificates if they don't exist
    if not (os.path.exists("cert.pem") and os.path.exists("key.pem")):
        generate_self_signed_cert()

    # Listen on all interfaces
    server_address = ('0.0.0.0', 8443)
    httpd = HTTPServer(server_address, CORSRequestHandler)
    
    # Create SSL context
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile='cert.pem', keyfile='key.pem')
    
    # Wrap socket with SSL
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    
    # Get the computer's local IP address
    import socket
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    print(f"Server running at:")
    print(f"- Local: https://localhost:8443")
    print(f"- Network: https://{local_ip}:8443")
    print("\nTo access from mobile device:")
    print("1. Connect your phone to the same WiFi network as this computer")
    print(f"2. Open https://{local_ip}:8443 in your phone's browser")
    print("3. Accept the security warning about the self-signed certificate")
    
    httpd.serve_forever()

if __name__ == '__main__':
    run_server() 