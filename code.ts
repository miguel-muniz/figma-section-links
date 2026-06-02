const OUTPUT_FORMATS = [
  'plain-text',
  'markdown-list',
  'markdown-table',
  'html',
  'html-table',
  'csv',
  'json',
  'yaml',
  'toml',
] as const
const SORT_ORDERS = ['layer-asc', 'layer-desc', 'alpha-asc', 'alpha-desc'] as const
const DEFAULT_IGNORED_PREFIXES = ['.', '_'] as const
const IGNORED_PREFIXES_KEY = 'ignored-section-prefixes'
const FILE_URL_KEY = 'figma-file-url'
const OUTPUT_FORMAT_KEY = 'output-format'
const SORT_ORDER_KEY = 'section-sort-order'

type OutputFormat = (typeof OUTPUT_FORMATS)[number]
type SortOrder = (typeof SORT_ORDERS)[number]

type SectionLink = {
  name: string
  url: string
  layerIndex: number
}

type StoredConfiguration = {
  fileUrl: string
  ignoredPrefixes: string[]
  outputFormat: OutputFormat
  sortOrder: SortOrder
}

type GenerateMessage = {
  type: 'generate'
  fileUrl: string
  ignoredPrefixes: string[]
}

type SaveConfigurationMessage = {
  type: 'save-configuration'
  fileUrl: string
  ignoredPrefixes: string[]
  outputFormat: OutputFormat
  sortOrder: SortOrder
}

type PluginMessage = GenerateMessage | SaveConfigurationMessage | { type: 'cancel' }

const DEFAULT_FILE_URL = ''
const DEFAULT_OUTPUT_FORMAT: OutputFormat = 'plain-text'
const DEFAULT_SORT_ORDER: SortOrder = 'layer-asc'

figma.showUI(__html__, { height: 780, themeColors: true, width: 360 })

void initialize()

figma.ui.onmessage = (msg: PluginMessage) => {
  if (msg.type === 'cancel') {
    figma.closePlugin()
    return
  }

  if (msg.type === 'save-configuration') {
    void saveConfiguration(msg)
    return
  }

  if (msg.type === 'generate') {
    void sendSectionLinks(msg.ignoredPrefixes, msg.fileUrl)
  }
}

async function initialize() {
  const configuration = await getStoredConfiguration()

  figma.ui.postMessage({
    type: 'initialize',
    fileUrl: configuration.fileUrl,
    ignoredPrefixes: configuration.ignoredPrefixes,
    outputFormat: configuration.outputFormat,
    sortOrder: configuration.sortOrder,
  })

  await sendSectionLinks(configuration.ignoredPrefixes, configuration.fileUrl)
}

async function getStoredConfiguration(): Promise<StoredConfiguration> {
  const [storedFileUrl, storedPrefixes, storedOutputFormat, storedSortOrder] = await Promise.all([
    figma.clientStorage.getAsync(FILE_URL_KEY),
    figma.clientStorage.getAsync(IGNORED_PREFIXES_KEY),
    figma.clientStorage.getAsync(OUTPUT_FORMAT_KEY),
    figma.clientStorage.getAsync(SORT_ORDER_KEY),
  ])

  const ignoredPrefixes = Array.isArray(storedPrefixes)
    ? normalizePrefixes(storedPrefixes.filter((value): value is string => typeof value === 'string'))
    : Array.from(DEFAULT_IGNORED_PREFIXES)
  const fileUrl = typeof storedFileUrl === 'string' ? storedFileUrl : DEFAULT_FILE_URL
  const sortOrder = isSortOrder(storedSortOrder) ? storedSortOrder : DEFAULT_SORT_ORDER
  const outputFormat = isOutputFormat(storedOutputFormat) ? storedOutputFormat : DEFAULT_OUTPUT_FORMAT

  return { fileUrl, ignoredPrefixes, outputFormat, sortOrder }
}

async function saveConfiguration(configuration: SaveConfigurationMessage) {
  await Promise.all([
    figma.clientStorage.setAsync(FILE_URL_KEY, normalizeFileUrl(configuration.fileUrl)),
    figma.clientStorage.setAsync(IGNORED_PREFIXES_KEY, normalizePrefixes(configuration.ignoredPrefixes)),
    figma.clientStorage.setAsync(
      OUTPUT_FORMAT_KEY,
      isOutputFormat(configuration.outputFormat) ? configuration.outputFormat : DEFAULT_OUTPUT_FORMAT,
    ),
    figma.clientStorage.setAsync(
      SORT_ORDER_KEY,
      isSortOrder(configuration.sortOrder) ? configuration.sortOrder : DEFAULT_SORT_ORDER,
    ),
  ])
}

async function sendSectionLinks(ignoredPrefixes: string[], fileUrl: string) {
  await figma.currentPage.loadAsync()

  const fileBaseUrl = getFileBaseUrl(fileUrl)
  const prefixes = normalizePrefixes(ignoredPrefixes)
  const pageSections = figma.currentPage.children.filter((node) => node.type === 'SECTION')
  const layerOrderedSections = pageSections.slice().reverse()
  const sections = fileBaseUrl
    ? layerOrderedSections
        .filter((section) => !prefixes.some((prefix) => section.name.startsWith(prefix)))
        .map<SectionLink>((section, layerIndex) => ({
          name: section.name,
          url: getNodeUrl(section.id, fileBaseUrl),
          layerIndex,
        }))
    : []

  figma.ui.postMessage({
    type: 'section-links',
    sections,
    totalSectionCount: pageSections.length,
    pageName: figma.currentPage.name,
  })
}

function normalizePrefixes(prefixes: string[]) {
  const uniquePrefixes: string[] = []

  for (const prefix of prefixes) {
    const normalizedPrefix = prefix.trim()

    if (normalizedPrefix && !uniquePrefixes.includes(normalizedPrefix)) {
      uniquePrefixes.push(normalizedPrefix)
    }
  }

  return uniquePrefixes
}

function normalizeFileUrl(fileUrl: string) {
  return fileUrl.trim()
}

function isSortOrder(value: unknown): value is SortOrder {
  return SORT_ORDERS.includes(value as SortOrder)
}

function isOutputFormat(value: unknown): value is OutputFormat {
  return OUTPUT_FORMATS.includes(value as OutputFormat)
}

function getNodeUrl(nodeId: string, fileBaseUrl: string) {
  const encodedNodeId = encodeURIComponent(nodeId.split(':').join('-'))

  return `${fileBaseUrl}?node-id=${encodedNodeId}`
}

function getFileBaseUrl(fileUrl: string) {
  const match = normalizeFileUrl(fileUrl).match(/figma\.com\/(?:file|design)\/([^/?#]+)(?:\/([^?#]+))?/)

  if (!match) {
    return ''
  }

  const fileKey = match[1]
  const fileName = match[2] ? decodeURIComponent(match[2]) : figma.root.name

  return `https://www.figma.com/design/${fileKey}/${slugify(fileName)}`
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'file'
}
