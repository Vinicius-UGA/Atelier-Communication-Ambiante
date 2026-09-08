#!/usr/bin/env python3
import sys, os, tempfile
from urllib.parse import urljoin
import qrcode
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor

if len(sys.argv) != 3:
    print('Usage: python generate_pdf_qr.py <base_url> <output.pdf>')
    sys.exit(1)

base_url = sys.argv[1].rstrip('/') + '/'
out_pdf = sys.argv[2]

W, H = A4
c = canvas.Canvas(out_pdf, pagesize=A4)

for groupe in range(1, 6):
    c.setFillColor(HexColor('#172033'))
    c.setFont('Helvetica-Bold', 24)
    c.drawCentredString(W/2, H - 28*mm, 'Atelier Communication Ambiante')

    c.setFillColor(HexColor('#1f6feb'))
    c.setFont('Helvetica-Bold', 20)
    c.drawCentredString(W/2, H - 41*mm, f'Groupe {groupe}')

    y_positions = [H - 86*mm, H - 151*mm, H - 216*mm]
    for phase, y in zip((1,2,3), y_positions):
        url = urljoin(base_url, f'phase-{phase}/groupe-{groupe}/')
        c.setFillColor(HexColor('#172033'))
        c.setFont('Helvetica-Bold', 16)
        c.drawString(28*mm, y + 18*mm, f'Phase {phase}')

        qr = qrcode.QRCode(version=None, box_size=10, border=3)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color='black', back_color='white')
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tf:
            tmp = tf.name
        img.save(tmp)
        c.drawImage(tmp, 118*mm, y - 5*mm, width=42*mm, height=42*mm, preserveAspectRatio=True, mask='auto')
        os.remove(tmp)

        c.setFillColor(HexColor('#667085'))
        c.setFont('Helvetica', 8)
        c.drawString(28*mm, y + 9*mm, f'Accès à la page Phase {phase} - Groupe {groupe}')

        c.setStrokeColor(HexColor('#dbe3ef'))
        c.line(28*mm, y - 9*mm, W - 28*mm, y - 9*mm)

    c.setFillColor(HexColor('#667085'))
    c.setFont('Helvetica', 8)
    c.drawCentredString(W/2, 12*mm, 'Grenoble INP - Génie industriel')
    c.showPage()

c.save()
print(out_pdf)
