import SongSearchForm from '../SongSearchForm';

export default function SongSearchFormExample() {
  return (
    <div className="max-w-2xl mx-auto p-8">
      <SongSearchForm 
        onSearch={(title, artist) => console.log('Searching for:', title, artist)}
        isLoading={false}
      />
    </div>
  );
}
