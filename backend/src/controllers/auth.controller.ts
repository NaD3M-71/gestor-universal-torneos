import type { Request, Response } from 'express';
import { registrarUsuario } from '../application/registrarUsuario';

/**
 * POST /api/auth/registro
 * Crea un organizador y responde 201 con sus datos públicos. No inicia
 * sesión: eso lo hace el login (1.3). Los datos ya pasaron por las
 * validaciones de la ruta. Si algo falla, Express 5 manda el error al
 * manejador central.
 */
export const registrar = async (req: Request, res: Response): Promise<void> => {
  const { nombre, apellido, email, contrasena } = req.body;

  const usuario = await registrarUsuario({
    nombre,
    apellido,
    email,
    contrasena,
  });

  res.status(201).json({ usuario });
};
