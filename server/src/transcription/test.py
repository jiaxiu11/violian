import sys
import seaborn
import numpy, scipy
import librosa
import soundfile as sf
import io
import json
from six.moves.urllib.request import urlopen

# returns (onset, note, duration)
def main():
    try:
        if len(sys.argv) != 2:
            return
        url = str(sys.argv[1])
        data, sr = sf.read(io.BytesIO(urlopen(url).read()))
        
        # check audio channels
        if len(data.shape) > 1:
            x = data[:, 0]
        else:
            x = data
            
        hop_length = 100
        onset_env = librosa.onset.onset_strength(x, sr=sr, hop_length=hop_length)
        onset_samples = librosa.onset.onset_detect(x,
                                                sr=sr, units='samples', 
                                                hop_length=hop_length, 
                                                backtrack=False,
                                                pre_max=20,
                                                post_max=20,
                                                pre_avg=50,
                                                post_avg=50,
                                                delta=0.2,
                                                wait=20)

        onset_boundaries = numpy.concatenate([onset_samples, [len(x)]])

        onset_times = librosa.samples_to_time(onset_boundaries, sr=sr)

        # return a JSON object
        result = ([
            estimate_pitch_and_duration(x, onset_boundaries, i, sr=sr)
            for i in range(len(onset_boundaries)-1)
        ])

        print(json.dumps({'success': 1, 'transcribed_notes': result}))
        return True
    except Exception as e:
        print(json.dumps({'success': 0, 'error': str(e)}))

def estimate_pitch(segment, sr, fmin=200.0, fmax=2000.0):
    
    # Compute autocorrelation of input segment.
    r = librosa.autocorrelate(segment)
    # Define lower and upper limits for the autocorrelation argmax.
    i_min = sr/fmax
    i_max = sr/fmin
    r[:int(i_min)] = 0
    r[int(i_max):] = 0
    
    # Find the location of the maximum autocorrelation.
    i = r.argmax()
    f0 = float(sr)/i
    return f0

def estimate_pitch_and_duration(x, onset_samples, i, sr):
    n0 = onset_samples[i]
    n1 = onset_samples[i+1]
    f0 = estimate_pitch(x[n0:n1], sr)
    duration = (n1-n0)/sr
    # return [librosa.hz_to_note(f0), f0, round(duration, 2)]
    return {'onset': round(n0/sr, 2), 'note' : librosa.hz_to_note(f0), 'duration': round(duration, 2)}


if __name__ == "__main__":
    main()
