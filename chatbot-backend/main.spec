# main.spec
# -*- mode: python ; coding: utf-8 -*-
import os
from PyInstaller.utils.hooks import collect_submodules, collect_data_files

block_cipher = None

# Path to the llama_cpp shared library (Change "chatbot" to the name of your environment)
llama_cpp_lib_path = r'..\chatbot\Lib\site-packages\llama_cpp'

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=[
        (os.path.join(llama_cpp_lib_path, 'llama.dll'), 'llama_cpp'),  # Include the DLL file
        (os.path.join(llama_cpp_lib_path, 'llama.lib'), 'llama_cpp'),  # Include the LIB file
    ],
    datas=collect_data_files('llama_cpp') + collect_data_files('llama-cpp-python'),
    hiddenimports=collect_submodules('llama_cpp') + collect_submodules('llama-cpp-python'),
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='main',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='main',
)
