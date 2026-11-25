const superadminService = require("../services/superadminService");

class SuperadminController {
  async listAdmins(req, res, next) {
    try {
      const { search, status, page, limit } = req.query;
      const data = await superadminService.listAdmins({
        search,
        status,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });
      res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  async inviteAdmin(req, res, next) {
    try {
      const { email, name, permissionKeys } = req.body;
      const result = await superadminService.inviteAdmin(
        { email, name, permissionKeys },
        req.user,
        req.auditRequest
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async resendInvite(req, res, next) {
    try {
      const { id } = req.params;
      const result = await superadminService.resendInvite(id, req.user, req.auditRequest);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async cancelInvite(req, res, next) {
    try {
      const { id } = req.params;
      const result = await superadminService.cancelInvite(id, req.user, req.auditRequest);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateAdminPermissions(req, res, next) {
    try {
      const { id } = req.params;
      const { permissionKeys, superadminPassword } = req.body;
      const result = await superadminService.updateAdminPermissions(
        id,
        { permissionKeys, superadminPassword },
        req.user,
        req.auditRequest
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateAdminStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await superadminService.updateAdminStatus(
        id,
        status,
        req.user,
        req.auditRequest
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async forceLogoutAdmin(req, res, next) {
    try {
      const { id } = req.params;
      const result = await superadminService.forceLogoutAdmin(id, req.user, req.auditRequest);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async triggerAdminPasswordReset(req, res, next) {
    try {
      const { id } = req.params;
      const result = await superadminService.triggerAdminPasswordReset(
        id,
        req.user,
        req.auditRequest
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async listPermissions(req, res, next) {
    try {
      const permissions = await superadminService.listAllPermissions();
      res.status(200).json({ success: true, permissions });
    } catch (err) {
      next(err);
    }
  }

  async listPresets(req, res, next) {
    try {
      const presets = await superadminService.listPresets();
      res.status(200).json({ success: true, presets });
    } catch (err) {
      next(err);
    }
  }

  async createPreset(req, res, next) {
    try {
      const { name, description, permissionKeys } = req.body;
      const preset = await superadminService.createPreset(
        { name, description, permissionKeys },
        req.user,
        req.auditRequest
      );
      res.status(201).json({ success: true, preset });
    } catch (err) {
      next(err);
    }
  }

  async updatePreset(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, permissionKeys } = req.body;
      const preset = await superadminService.updatePreset(
        id,
        { name, description, permissionKeys },
        req.user,
        req.auditRequest
      );
      res.status(200).json({ success: true, preset });
    } catch (err) {
      next(err);
    }
  }

  async deletePreset(req, res, next) {
    try {
      const { id } = req.params;
      const result = await superadminService.deletePreset(id, req.user, req.auditRequest);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SuperadminController();
