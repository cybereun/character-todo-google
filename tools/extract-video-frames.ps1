param(
  [Parameter(Mandatory=$true)]
  [string]$VideoPath,

  [Parameter(Mandatory=$true)]
  [string]$OutputDir
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$player = New-Object System.Windows.Media.MediaPlayer
$player.Open([Uri]::new((Resolve-Path -LiteralPath $VideoPath).Path))

for ($i = 0; $i -lt 50; $i++) {
  if ($player.NaturalVideoWidth -gt 0 -and $player.NaturalVideoHeight -gt 0) { break }
  Start-Sleep -Milliseconds 100
}

if ($player.NaturalVideoWidth -le 0 -or $player.NaturalVideoHeight -le 0) {
  throw "Could not read video dimensions."
}

$duration = 5.0
if ($player.NaturalDuration.HasTimeSpan) {
  $duration = [Math]::Max(0.5, $player.NaturalDuration.TimeSpan.TotalSeconds)
}

$width = $player.NaturalVideoWidth
$height = $player.NaturalVideoHeight
$sampleCount = 18

for ($i = 0; $i -lt $sampleCount; $i++) {
  $seconds = [Math]::Min($duration - 0.05, ($duration / ($sampleCount + 1)) * ($i + 1))
  $player.Position = [TimeSpan]::FromSeconds($seconds)
  Start-Sleep -Milliseconds 220

  $visual = New-Object System.Windows.Media.DrawingVisual
  $context = $visual.RenderOpen()
  $context.DrawVideo($player, [System.Windows.Rect]::new(0, 0, $width, $height))
  $context.Close()

  $bitmap = New-Object System.Windows.Media.Imaging.RenderTargetBitmap(
    $width,
    $height,
    96,
    96,
    [System.Windows.Media.PixelFormats]::Pbgra32
  )
  $bitmap.Render($visual)

  $encoder = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
  $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($bitmap))

  $outPath = Join-Path $OutputDir ("frame_{0:D2}_{1:N2}s.png" -f $i, $seconds)
  $stream = [System.IO.File]::Open($outPath, [System.IO.FileMode]::Create)
  try {
    $encoder.Save($stream)
  } finally {
    $stream.Dispose()
  }
}

$player.Close()
Get-ChildItem -LiteralPath $OutputDir -Filter *.png | Select-Object FullName,Length
