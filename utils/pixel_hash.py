#!/usr/bin/env python3

# Calculates an image's pixel hash as per the algorithm used by Danbooru

from pyvips import Image
from tempfile import TemporaryFile
from pathlib import Path
from typing import cast
import hashlib
import sys

if len(sys.argv) != 2:
    print("No file supplied")
    exit(1)

infile = Path(sys.argv[1]).resolve()
if not infile.exists():
    print("File does not exist")
    exit(1)

# https://github.com/danbooru/danbooru/blob/bd0c6a37a81f851bd3e7862b97f7cf2fae7d5381/app/logical/media_file/image.rb#L214
image: Image = Image.new_from_file(infile)

if image.get_typeof("icc-profile-data") != 0:
    image = cast(Image, image.icc_transform("srgb"))

if image.interpretation != "srgb":
    image = cast(Image, image.colourspace("srgb"))

if not image.hasalpha():
    image = cast(Image, image.addalpha())

output_file = TemporaryFile("wb+")
output_file.write("P7\n".encode())
output_file.write(f"WIDTH {image.width}\n".encode())
output_file.write(f"HEIGHT {image.height}\n".encode())
output_file.write(f"DEPTH {image.bands}\n".encode())
output_file.write("MAXVAL 255\n".encode())
output_file.write("TUPLTYPE RGB_ALPHA\n".encode())
output_file.write("ENDHDR\n".encode())
output_file.flush()
image.rawsave_fd(output_file.fileno())
output_file.flush()
output_file.seek(0)

file_hash = hashlib.md5()
while chunk := output_file.read(65536):
    file_hash.update(chunk)

print(f"{infile.name}  {file_hash.hexdigest()}")
