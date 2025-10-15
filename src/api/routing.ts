/**
 * Routing Rules API endpoints
 * API
 */

import { Hono } from 'hono';
import type { Database } from '../db/database';
import type { CreateRoutingRuleInput, UpdateRoutingRuleInput } from '../types';
import { ValidationError, NotFoundError } from '../types';

export function createRoutingAPI(db: Database) {
  const app = new Hono();

  /**
   * GET /api/routing/rules
 * List all routing rules
   */
  app.get('/rules', (c) => {
    const rules = db.getRoutingRules();
    return c.json({
      success: true,
      data: rules,
    });
  });

  /**
   * GET /api/routing/rules/enabled
 * List enabled routing rules
   */
  app.get('/rules/enabled', (c) => {
    const rules = db.getEnabledRoutingRules();
    return c.json({
      success: true,
      data: rules,
    });
  });

  /**
   * GET /api/routing/rules/:id
 * Get a single routing rule
   */
  app.get('/rules/:id', (c) => {
    const id = c.req.param('id');
    const rule = db.getRoutingRule(id);

    if (!rule) {
      throw new NotFoundError(`Routing rule not found: ${id}`);
    }

    return c.json({
      success: true,
      data: rule,
    });
  });

  /**
   * POST /api/routing/rules
 * Create a new routing rule
   */
  app.post('/rules', async (c) => {
    const body = await c.req.json();

    //// Validate input
    if (!body.name || !body.type || !body.condition || !body.targetChannel) {
      throw new ValidationError(
        'Missing required fields: name, type, condition, targetChannel'
      );
    }

    const input: CreateRoutingRuleInput = {
      name: body.name,
      type: body.type,
      condition: body.condition,
      targetChannel: body.targetChannel,
      targetModel: body.targetModel,
      priority: body.priority,
    };

    const rule = db.createRoutingRule(input);

    return c.json(
      {
        success: true,
        data: rule,
      },
      201
    );
  });

  /**
   * PUT /api/routing/rules/:id
 * Update a routing rule
   */
  app.put('/rules/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();

    //// Check if rule exists
    const existing = db.getRoutingRule(id);
    if (!existing) {
      throw new NotFoundError(`Routing rule not found: ${id}`);
    }

    const input: UpdateRoutingRuleInput = {
      name: body.name,
      condition: body.condition,
      targetChannel: body.targetChannel,
      targetModel: body.targetModel,
      priority: body.priority,
      enabled: body.enabled,
    };

    const rule = db.updateRoutingRule(id, input);

    return c.json({
      success: true,
      data: rule,
    });
  });

  /**
   * DELETE /api/routing/rules/:id
 * Delete a routing rule
   */
  app.delete('/rules/:id', (c) => {
    const id = c.req.param('id');

    const deleted = db.deleteRoutingRule(id);
    if (!deleted) {
      throw new NotFoundError(`Routing rule not found: ${id}`);
    }

    return c.json({
      success: true,
      message: 'Routing rule deleted',
    });
  });

  /**
   * POST /api/routing/rules/:id/enable
 * Enable a routing rule
   */
  app.post('/rules/:id/enable', (c) => {
    const id = c.req.param('id');

    const existing = db.getRoutingRule(id);
    if (!existing) {
      throw new NotFoundError(`Routing rule not found: ${id}`);
    }

    const rule = db.updateRoutingRule(id, { enabled: true });

    return c.json({
      success: true,
      data: rule,
    });
  });

  /**
   * POST /api/routing/rules/:id/disable
 * Disable a routing rule
   */
  app.post('/rules/:id/disable', (c) => {
    const id = c.req.param('id');

    const existing = db.getRoutingRule(id);
    if (!existing) {
      throw new NotFoundError(`Routing rule not found: ${id}`);
    }

    const rule = db.updateRoutingRule(id, { enabled: false });

    return c.json({
      success: true,
      data: rule,
    });
  });

  /**
   * POST /api/routing/test
 * Test routing with a mock request
   */
  app.post('/test', async (c) => {
    const body = await c.req.json();

    // This endpoint will be implemented when integrating with SmartRouter
    //// SmartRouter
    return c.json({
      success: true,
      message: 'Test routing endpoint (to be implemented)',
      data: {
        request: body,
        matchedRule: null,
        selectedChannel: null,
      },
    });
  });

  return app;
}
