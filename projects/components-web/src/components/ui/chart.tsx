// @ts-nocheck
import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfiguration = {
  [key in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProperties = {
  configuration: ChartConfiguration
}

const ChartContext = React.createContext<ChartContextProperties | null>(null)

function useChart(): ChartContextProperties {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    configuration: ChartConfiguration
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"]
  }
>(({ id: identifier, className, children, configuration, ...properties }, reference) => {
  const uniqueIdentifier = React.useId()
  const chartIdentifier = `chart-${identifier || uniqueIdentifier.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ configuration }}>
      <div
        data-chart={chartIdentifier}
        ref={reference}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...properties}
      >
        <ChartStyle identifier={chartIdentifier} configuration={configuration} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"

const ChartStyle = ({
  identifier,
  configuration,
}: {
  identifier: string
  configuration: ChartConfiguration
}): React.JSX.Element | null => {
  const colorConfiguration = Object.entries(configuration).filter(
    ([, itemConfiguration]) => itemConfiguration.theme || itemConfiguration.color
  )

  if (!colorConfiguration.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${identifier}] {
${colorConfiguration
  .map(([key, itemConfiguration]) => {
    const color =
      itemConfiguration.theme?.[theme as keyof typeof THEMES] ||
      itemConfiguration.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

export interface ChartTooltipContentProperties
  extends RechartsPrimitive.TooltipContentProps {
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: "line" | "dot" | "dashed"
  nameKey?: string
  labelKey?: string
  color?: string
  className?: string
}

interface PayloadItem {
  type?: string
  name?: string
  dataKey?: string | number
  payload?: {
    fill?: string
    [key: string]: unknown
  }
  color?: string
  value?: number | string | (number | string)[]
  fill?: string
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProperties
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    reference
  ) => {
    const { configuration } = useChart()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const key = `${labelKey || item?.dataKey || item?.name || "value"}`
      const itemConfiguration = getPayloadConfigurationFromPayload(configuration, item, key)
      const value =
        !labelKey && typeof label === "string"
          ? configuration[label as keyof typeof configuration]?.label || label
          : itemConfiguration?.label

      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(value, payload)}
          </div>
        )
      }

      if (!value) {
        return null
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>
    }, [
      label,
      labelFormatter,
      payload,
      hideLabel,
      labelClassName,
      configuration,
      labelKey,
    ])

    if (!active || !payload?.length) {
      return null
    }

    const nestLabel = payload.length === 1 && indicator !== "dot"

    return (
      <div
        ref={reference}
        className={cn(
          "grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload
            ?.filter((item: PayloadItem) => item.type !== "none")
            .map((item: PayloadItem, index: number) => {
              const key = `${nameKey || item.name || item.dataKey || "value"}`
              const itemConfiguration = getPayloadConfigurationFromPayload(
                configuration,
                item,
                key
              )
              const indicatorColor = color || item.payload?.fill || item.color

              return (
                <div
                  key={item.dataKey}
                  className={cn(
                    "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                    indicator === "dot" && "items-center"
                  )}
                >
                  {formatter && item?.value !== undefined && item.name ? (
                    formatter(item.value, item.name, item, index, item.payload)
                  ) : (
                    <>
                      {itemConfiguration?.icon ? (
                        <itemConfiguration.icon />
                      ) : (
                        !hideIndicator && (
                          <div
                            className={cn(
                              "shrink-0 rounded-xs border-[--color-border] bg-[--color-bg]",
                              {
                                "h-2.5 w-2.5": indicator === "dot",
                                "w-1": indicator === "line",
                                "w-0 border-[1.5px] border-dashed bg-transparent":
                                  indicator === "dashed",
                                "my-0.5": nestLabel && indicator === "dashed",
                              }
                            )}
                            style={
                              {
                                "--color-bg": indicatorColor,
                                "--color-border": indicatorColor,
                              } as React.CSSProperties & {
                                [key: `--${string}`]: string | undefined
                              }
                            }
                          />
                        )
                      )}
                      <div
                        className={cn(
                          "flex flex-1 justify-between leading-none",
                          nestLabel ? "items-end" : "items-center"
                        )}
                      >
                        <div className="grid gap-1.5">
                          {nestLabel ? tooltipLabel : null}
                          <span className="text-muted-foreground">
                            {itemConfiguration?.label || item.name}
                          </span>
                        </div>
                        {item.value && (
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {item.value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltip"

const ChartLegend = RechartsPrimitive.Legend

export interface ChartLegendContentProperties
  extends RechartsPrimitive.DefaultLegendContentProps {
  hideIcon?: boolean
  nameKey?: string
  className?: string
}

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  ChartLegendContentProperties
>(
  (
    { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey },
    reference
  ) => {
    const { configuration } = useChart()

    if (!payload?.length) {
      return null
    }

    return (
      <div
        ref={reference}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          className
        )}
      >
        {payload
          ?.filter((item: PayloadItem) => item.type !== "none")
          .map((item: PayloadItem, index: number) => {
            const key = `${nameKey || item.dataKey || "value"}`
            const itemConfiguration = getPayloadConfigurationFromPayload(configuration, item, key)

            return (
              <div
                key={
                  typeof item.value === "string" || typeof item.value === "number"
                    ? String(item.value)
                    : index
                }
                className={cn(
                  "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
                )}
              >
                {itemConfiguration?.icon && !hideIcon ? (
                  <itemConfiguration.icon />
                ) : (
                  <div
                    className="h-2 w-2 shrink-0 rounded-xs"
                    style={{
                      backgroundColor: item.color,
                    }}
                  />
                )}
                {itemConfiguration?.label}
              </div>
            )
          })}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegend"

// Helper to extract item configuration from a payload.
function getPayloadConfigurationFromPayload(
  configuration: ChartConfiguration,
  payload: unknown,
  key: string
):
  | {
      label?: React.ReactNode
      icon?: React.ComponentType
    }
  | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? (payload.payload as Record<string, unknown>)
      : undefined

  let configurationLabelKey: string = key

  const payloadObject = payload as Record<string, unknown>
  if (key in payloadObject && typeof payloadObject[key] === "string") {
    configurationLabelKey = payloadObject[key] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key] === "string"
  ) {
    configurationLabelKey = payloadPayload[key] as string
  }

  return configurationLabelKey in configuration
    ? configuration[configurationLabelKey]
    : configuration[key as keyof typeof configuration]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
