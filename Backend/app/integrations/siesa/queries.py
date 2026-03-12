from __future__ import annotations


# NOTA:
# - tipo_docto para POS: '01f' (según tu nota)
# - Traemos por "desde_ts" para incremental (creación/actualización)
# - Ajusta nombres exactos de columnas si en tu base varían (pero lo común en Zeus es así)

SQL_GET_DOCTOS_CHANGED = """
SELECT
  d.f9820_guid                         AS docto_guid,
  d.f9820_id_cia                       AS id_cia,
  d.f9820_id_co                        AS id_co,
  d.f9820_id_tipo_docto                AS tipo_docto,
  d.f9820_consec_docto                 AS consec_docto,
  d.f9820_rowid_tercero_vendedor       AS rowid_mesero,
  d.f9820_guid_control_tpv             AS guid_control_tpv,
  d.f9820_fecha_ts_creacion            AS ts_creacion,
  d.f9820_fecha_ts_actualizacion       AS ts_actualizacion
FROM t9820_pdv_d_doctos d
WHERE d.f9820_id_tipo_docto = ?
  AND (
        d.f9820_fecha_ts_creacion >= ?
     OR d.f9820_fecha_ts_actualizacion >= ?
  )
ORDER BY COALESCE(d.f9820_fecha_ts_actualizacion, d.f9820_fecha_ts_creacion) ASC
"""


SQL_GET_ITEMS_BY_DOCTO_GUIDS = """
SELECT
  m.f9830_guid_docto                   AS docto_guid,
  m.f9830_rowid_item_ext               AS rowid_item_ext,
  m.f9830_cant_1                       AS qty_1,
  m.f9830_cant_base                    AS qty_base,
  m.f9830_fecha_ts_creacion            AS ts_creacion,
  m.f9830_fecha_ts_actualizacion       AS ts_actualizacion
FROM t9830_pdv_d_movto_venta m
WHERE m.f9830_guid_docto IN ({placeholders})
"""


SQL_GET_ITEM_NAMES = """
SELECT
  ie.f121_rowid                        AS rowid_item_ext,
  ie.f121_rowid_item                   AS rowid_item,
  i.f120_descripcion                   AS item_nombre
FROM t121_mc_items_extensiones ie
JOIN t120_mc_items i ON i.f120_rowid = ie.f121_rowid_item
WHERE ie.f121_rowid IN ({placeholders})
"""


SQL_GET_TERCEROS = """
SELECT
  t.f200_rowid                         AS rowid_tercero,
  t.f200_nombre_est                    AS nombre_est
FROM t200_mm_terceros t
WHERE t.f200_rowid IN ({placeholders})
"""


SQL_GET_MESAS = """
SELECT
  c.f9851_guid                         AS guid_control_tpv,
  c.f9851_rowid_mesa                   AS rowid_mesa,
  c.f9851_referencia_mesa              AS referencia_mesa
FROM t9851_pdv_control_mesas c
WHERE c.f9851_guid IN ({placeholders})
"""