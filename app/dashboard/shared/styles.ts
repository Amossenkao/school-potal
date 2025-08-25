import { StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
	page: {
		flexDirection: 'column',
		backgroundColor: '#ffffff',
		margin: 0,
		padding: 25,
		// paddingBottom: 20,
		fontSize: 12,
	},

	// Header section
	topRow: {
		flexDirection: 'row',
		marginTop: 15,
		marginBottom: 20,
		borderBottom: 1,
		borderBottomColor: '#787',
		overflow: 'hidden',
	},

	headerLeft: {
		flexDirection: 'column',
		width: 700,
		gap: 6,
		paddingBottom: 4,
	},

	headerRight: {
		flexDirection: 'column',
		justifyContent: 'flex-end',
		width: 700,
		paddingLeft: 120,
		paddingBottom: 4,
	},

	// Main grades section
	gradesContainer: {
		flexDirection: 'row',
		marginBottom: 10,
		borderWidth: 1,
		borderColor: '#000',
		gap: 40,
	},

	semester: {
		flex: 1,
		borderRight: 1,
		borderRightColor: '#000',
	},

	lastSemester: {
		flex: 1,
		borderLeft: 1,
	},

	semesterHeader: {
		backgroundColor: '#f0f0f0',
		padding: 5,
		textAlign: 'center',
		borderBottom: 1,
		borderBottomColor: '#000',
		fontWeight: 'bold',
	},

	// Table styles

	subjectCell: {
		flex: 2,
		padding: 2,
		borderRight: 0.5,
		borderRightColor: '#000',
		textAlign: 'left',
		fontSize: 8,
		fontWeight: 'bold',
	},

	tableHeader: {
		flexDirection: 'row',
		backgroundColor: '#f0f0f0',
		borderBottom: 1,
		borderBottomColor: '#000',
		fontSize: 14,
		fontWeight: 'bold',
	},

	tableRow: {
		flexDirection: 'row',
		borderBottom: 0.5,
		borderBottomColor: '#000',
		height: 16,
		fontSize: 12,
	},

	tableCell: {
		flex: 1,
		padding: 2,
		borderRight: 0.5,
		borderRightColor: '#000',
		textAlign: 'center',
		fontSize: 8,
	},

	lastCell: {
		flex: 1,
		padding: 2,
		textAlign: 'center',
		fontSize: 8,
		justifyContent: 'center',
		alignContent: 'center',
		alignItems: 'center',
	},

	// Bottom section
	bottomSection: {
		flexDirection: 'row',
		marginTop: 10,
		justifyContent: 'space-around',
	},

	leftBottom: {
		flex: 1,
		marginRight: 40,
	},

	rightBottom: {
		flex: 1,
	},

	gradingMethod: {
		marginBottom: 10,
		padding: 5,
		borderWidth: 1,
		borderColor: '#000',
	},

	gradingTitle: {
		fontWeight: 'bold',
		marginBottom: 5,
		textAlign: 'center',
	},

	gradingText: {
		fontSize: 10,
		marginBottom: 2,
	},

	promotionText: {
		fontWeight: 'bold',
		marginBottom: 10,
		fontSize: 10,
		paddingLeft: 50,
	},

	signatureSection: {
		marginTop: 20,
		paddingLeft: 50,
	},

	// Second page styles

	pageTwoContainer: {
		flexDirection: 'row',
		height: '100%',
		gap: 25,
		borderTopWidth: 1,
		borderBottomWidth: 1,
	},
	schoolHeader: {
		textAlign: 'center',
		marginBottom: 20,
	},

	schoolName: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 5,
		marginTop: 10,
	},

	schoolDetails: {
		fontSize: 10,
		marginBottom: 2,
		top: -75,
	},

	reportTitle: {
		fontSize: 14,
		fontWeight: 'bold',
		marginTop: -110,
	},

	studentInfo: {
		marginBottom: 15,
		fontSize: 12,
		gap: 4,
		paddingLeft: 20,
	},

	parentsSection: {
		marginTop: 20,
		borderWidth: 1,
		borderColor: '#000',
	},

	parentsSectionTitle: {
		fontWeight: 'bold',
		marginTop: 20,
		marginBottom: 10,
		textAlign: 'center',
	},

	noteSection: {
		marginTop: 15,
		fontSize: 8,
	},
});

export default styles;
