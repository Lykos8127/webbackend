import Brevo from "@sendinblue/client"
import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

type OrderCompletedEvent = {
  id: string
}

const BREVO_API_KEY = process.env.BREVO_API_KEY
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL
const BREVO_SENDER_NAME =
  process.env.BREVO_SENDER_NAME || "Customer Care"
const BREVO_TEMPLATE_ID = process.env.BREVO_TEMPLATE_ID

export default async function orderConfirmationSubscriber({
  event,
  container,
}: SubscriberArgs<OrderCompletedEvent>) {
  if (!event?.data?.id) {
    return
  }

  const logger = safeResolveLogger(container)

  if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) {
    logger?.warn(
      "Brevo credentials missing; skipping order confirmation email."
    )
    return
  }

  const remoteQuery = container.resolve(
    ContainerRegistrationKeys.REMOTE_QUERY
  ) as (query: any) => Promise<any[]>

  const query = remoteQueryObjectFromString({
    entryPoint: "order",
    variables: {
      filters: { id: event.data.id },
    },
    fields: [
      "id",
      "display_id",
      "status",
      "payment_status",
      "fulfillment_status",
      "currency_code",
      "subtotal",
      "shipping_total",
      "tax_total",
      "discount_total",
      "total",
      "email",
      "customer.first_name",
      "customer.last_name",
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.address_1",
      "shipping_address.address_2",
      "shipping_address.postal_code",
      "shipping_address.city",
      "shipping_address.country_code",
      "shipping_address.phone",
      "items.id",
      "items.title",
      "items.quantity",
      "items.total",
      "items.unit_price",
      "items.thumbnail",
      "items.variant_title",
    ],
  })

  const [order] = await remoteQuery(query)

  if (!order) {
    logger?.warn(
      `Order ${event.data.id} not found while sending confirmation email.`
    )
    return
  }

  if (!order.email) {
    logger?.warn(
      `Order ${order.id} has no email; skipping confirmation email.`
    )
    return
  }

  const brevoClient = new Brevo.TransactionalEmailsApi()
  brevoClient.setApiKey(
    Brevo.TransactionalEmailsApiApiKeys.apiKey,
    BREVO_API_KEY
  )

  const recipientName =
    order.shipping_address?.first_name ||
    order.customer?.first_name ||
    ""

  const subject = `Order #${order.display_id ?? order.id} confirmed`

  const templateId = parseTemplateId(BREVO_TEMPLATE_ID)

  const sendPayload = templateId
    ? buildTemplatePayload({
        order,
        templateId,
        recipientName,
      })
    : buildHtmlPayload({
        order,
        recipientName,
        subject,
      })

  try {
    await brevoClient.sendTransacEmail(sendPayload)
    logger?.info(
      `Sent order confirmation email for order ${order.id} to ${order.email}.`
    )
  } catch (error) {
    logger?.error(
      `Failed to send Brevo email for order ${order.id}: ${
        (error as Error).message
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.completed",
}

function buildTemplatePayload({
  order,
  templateId,
  recipientName,
}: {
  order: any
  templateId: number
  recipientName: string
}) {
  return {
    templateId,
    to: [
      {
        email: order.email,
        name: recipientName,
      },
    ],
    params: buildTemplateParams(order),
  }
}

function buildHtmlPayload({
  order,
  subject,
  recipientName,
}: {
  order: any
  subject: string
  recipientName: string
}) {
  return {
    sender: {
      email: BREVO_SENDER_EMAIL!,
      name: BREVO_SENDER_NAME,
    },
    to: [
      {
        email: order.email,
        name: recipientName,
      },
    ],
    subject,
    htmlContent: buildHtmlContent(order),
  }
}

function buildTemplateParams(order: any) {
  return {
    order_number: order.display_id ?? order.id,
    order_status: order.status,
    order_total: formatCurrency(order.total, order.currency_code),
    shipping_total: formatCurrency(order.shipping_total, order.currency_code),
    subtotal: formatCurrency(order.subtotal, order.currency_code),
    tax_total: formatCurrency(order.tax_total, order.currency_code),
    items: (order.items ?? []).map((item: any) => ({
      title: item.title,
      quantity: item.quantity,
      total: formatCurrency(item.total, order.currency_code),
    })),
    shipping_address: formatAddress(order.shipping_address),
  }
}

function buildHtmlContent(order: any) {
  const itemsHtml = (order.items ?? [])
    .map((item: any) => {
      const qty = item.quantity ?? 0
      const total = formatCurrency(item.total, order.currency_code)
      return `
        <tr>
          <td>${item.title || "Item"}</td>
          <td style="text-align:center;">${qty}</td>
          <td style="text-align:right;">${total}</td>
        </tr>
      `
    })
    .join("")

  const summaryRows = [
    ["Subtotal", formatCurrency(order.subtotal, order.currency_code)],
    ["Shipping", formatCurrency(order.shipping_total, order.currency_code)],
    ["Tax", formatCurrency(order.tax_total, order.currency_code)],
    ["Total", formatCurrency(order.total, order.currency_code)],
  ]
    .map(
      ([label, value]) =>
        `<tr><td>${label}</td><td style="text-align:right;">${value}</td></tr>`
    )
    .join("")

  return `
    <div style="font-family: Arial, sans-serif; color:#111;">
      <h2 style="margin-bottom:8px;">Thank you for your purchase!</h2>
      <p style="margin-top:0;">Order #${order.display_id ?? order.id}</p>

      <h3>Items</h3>
      <table width="100%" cellspacing="0" cellpadding="8" style="border-collapse:collapse;">
        <thead>
          <tr style="text-align:left;border-bottom:1px solid #ccc;">
            <th>Item</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <h3>Summary</h3>
      <table width="100%" cellspacing="0" cellpadding="4">
        <tbody>${summaryRows}</tbody>
      </table>

      ${
        order.shipping_address
          ? `<h3>Shipping Address</h3><p>${formatAddress(
              order.shipping_address
            )}</p>`
          : ""
      }
    </div>
  `
}

function formatAddress(address: any) {
  if (!address) {
    return ""
  }

  return (
    [
      `${address.first_name || ""} ${address.last_name || ""}`.trim(),
      address.address_1,
      address.address_2,
      `${address.postal_code || ""} ${address.city || ""}`.trim(),
      address.country_code?.toUpperCase(),
    ]
      .filter(Boolean)
      .join("<br/>") || ""
  )
}

function formatCurrency(value: any, currencyCode?: string) {
  const amount = typeof value === "number" ? value : Number(value) || 0
  if (!currencyCode) {
    return amount.toFixed(2)
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode.toUpperCase(),
    }).format(amount / 100)
  } catch {
    return `${(amount / 100).toFixed(2)} ${currencyCode.toUpperCase()}`
  }
}

function parseTemplateId(templateId?: string) {
  if (!templateId) {
    return undefined
  }

  const parsed = Number(templateId)
  return Number.isFinite(parsed) ? parsed : undefined
}

function safeResolveLogger(container: any) {
  try {
    return container.resolve("logger")
  } catch {
    return console
  }
}

