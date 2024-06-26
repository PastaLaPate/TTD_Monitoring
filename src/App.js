import { Box, TextField, Button } from '@mui/material';
import { useEffect, useState } from 'react';
import axios from 'axios';
import MiniSearch from 'minisearch';
import Chart from 'react-apexcharts';

function App() {
	const [units, setUnits] = useState([]);
	const [searchValue, setSearchValue] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10; // Number of items to display per page

	useEffect(() => {
		const fetchData = async () => {
			const UnitsDisplays = await axios.get(
				'https://api.toilettowerdefense.com/getTroopDisplays'
			);
			const resp = await axios.get(
				'https://api.toilettowerdefense.com/getExistCount'
			);
			// Get the current date/time
			var currentDate = new Date();

			// Get the local timezone offset in minutes
			var timezoneOffsetInMinutes = currentDate.getTimezoneOffset();

			// Adjust the current date/time by the timezone offset to get the local time
			var localTime = new Date(
				currentDate.getTime() - timezoneOffsetInMinutes * 60000
			);

			// Get the local epoch time (in milliseconds)
			var localEpochTime = localTime.getTime() / 1000;
			const datas = await axios.get(
				'http://ssh.server.bekaert.fr:1030/monitoring_data?start_time=' +
					parseInt(localEpochTime - 72 * 3600) +
					'&end_time=' +
					parseInt(localEpochTime)
			);

			const search = new MiniSearch({
				fields: ['displayName', 'rarity'],
				storeFields: [
					'displayName',
					'labels',
					'rarity',
					'chartDatas',
					'img',
				],
			});

			const promises = resp.data
				.filter((elem) => !elem.key.startsWith('Crates:'))
				.map(async (elem, i) => {
					const troopName = elem.key.substring(7);
					const unitsData = await axios.get(
						'https://api.toilettowerdefense.com/getTroopData',
						{
							params: { id: elem.key.substring(7) },
						}
					);

					const chartData = datas.data.filter(
						(data) => data[1].substring(7) === troopName
					);
					const labels = chartData.map(
						(data) =>
							`${new Date(data[2]).getHours()}:${new Date(
								data[2]
							).getMinutes()}`
					);
					const finalValues = chartData.map((data) => data[3]);
					const finalTimestamps = chartData.map((data) =>
						new Date(data[2]).getTime()
					);
					const finalDatas = finalValues.map((value, i) => [
						finalTimestamps[i],
						value,
					]);
					return {
						...elem,
						id: i,
						name: troopName,
						labels: labels,
						min: parseInt(localEpochTime - 72 * 3600) * 1000,
						displayName: UnitsDisplays.data[troopName],
						chartDatas: finalDatas,
						img: unitsData.data.image,
						rarity: unitsData.data.rarity,
					};
				});

			const units = await Promise.all(promises);
			search.addAll(units);
			setUnits(units);
		};

		fetchData();
	}, []);

	// Filter units based on search query
	const filteredUnits = units.filter((unit) =>
		unit.displayName.toLowerCase().includes(searchValue.toLowerCase())
	);

	// Calculate pagination variables
	const indexOfLastItem = currentPage * itemsPerPage;
	const indexOfFirstItem = indexOfLastItem - itemsPerPage;
	const currentItems = filteredUnits.slice(indexOfFirstItem, indexOfLastItem);

	// Change page
	const paginate = (pageNumber) => setCurrentPage(pageNumber);

	return (
		<Box>
			<h1>TTD Monitor</h1>
			<TextField
				id="search"
				label="Search"
				placeholder="Search..."
				value={searchValue}
				onChange={(e) => setSearchValue(e.target.value)}
			/>
			<Box
				display={'flex'}
				justifyContent={'center'}
				alignItems={'center'}
				flexWrap={'wrap'}
			>
				{currentItems.map((elem) => (
					<Box
						key={elem.id}
						display={'flex'}
						justifyContent={'center'}
						alignItems={'center'}
						flexDirection={'column'}
						sx={{ m: 3, p: 3, bgcolor: '#00115A', borderRadius: 6 }}
					>
						<h2>
							<img
								alt={'unit icon'}
								width={100}
								height={100}
								src={
									'https://api.toilettowerdefense.com/image-thumbnail/' +
									elem.img
								}
							/>
							{elem.displayName}
						</h2>
						<Chart
							options={{
								chart: {
									height: 350,
									type: 'area',
								},
								dataLabels: {
									enabled: false,
								},
								stroke: {
									curve: 'smooth',
								},

								xaxis: {
									type: 'datetime',
									min: elem.min,
									tickAmount: 6,
								},
								tooltip: {
									x: {
										format: 'dd MMM yyyy HH:MM',
									},
								},
								fill: {
									type: 'gradient',
									gradient: {
										shadeIntensity: 1,
										opacityFrom: 0.7,
										opacityTo: 0.9,
										stops: [0, 100],
									},
								},
							}}
							type="area"
							height={350}
							series={[
								{
									name: elem.displayName,
									data: elem.chartDatas,
								},
							]}
						/>
					</Box>
				))}
			</Box>
			{/* Pagination */}
			<Box display="flex" justifyContent="center" alignItems="center">
				<Button
					onClick={() => paginate(currentPage - 1)}
					disabled={currentPage === 1}
				>
					Previous
				</Button>
				<Button
					onClick={() => paginate(currentPage + 1)}
					disabled={indexOfLastItem >= filteredUnits.length}
				>
					Next
				</Button>
			</Box>
		</Box>
	);
}

export default App;
